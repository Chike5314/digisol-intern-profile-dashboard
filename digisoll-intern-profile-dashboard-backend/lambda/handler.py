import json
import os
import uuid
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

TABLE_NAME = os.environ.get('TABLE_NAME', '')
BUCKET_NAME = os.environ.get('BUCKET_NAME', '')


def get_table():
    if not TABLE_NAME:
        raise ValueError("TABLE_NAME environment variable is not set in Lambda configuration.")
    return dynamodb.Table(TABLE_NAME)


def get_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        "body": json.dumps(body)
    }


# --- Response shaping -------------------------------------------------------
# Allowlist, not denylist: fields not listed here never leak, even if someone
# adds a new internal attribute to an item later and forgets to update this.

def shape_public(item):
    """Fields safe to show to ANY authenticated user, regardless of department."""
    base = {
        "id": item.get("id"),
        "type": item.get("type"),
        "department": item.get("department"),
        "visibility": item.get("visibility"),
    }
    if item.get("type") == "PROFILE":
        base.update({
            "name": item.get("name"),
            "field": item.get("field"),
            "school": item.get("school"),
            "avatarUrl": item.get("avatarUrl"),
        })
    else:  # PHOTO
        base.update({
            "caption": item.get("caption"),
            "imageUrl": item.get("imageUrl"),
        })
    return base


def shape_workspace(item, user_id):
    """Fields visible to a member of the SAME department, managing their own workspace.
    A bit more than public (who created it, when) but still no raw internal keys.
    Also tells the frontend whether the CALLER owns this item, so the UI can hide
    edit/delete controls for items a MEMBER doesn't own without a round-trip guess."""
    shaped = shape_public(item)
    shaped["createdBy"] = item.get("createdBy")
    shaped["createdAt"] = item.get("createdAt")
    shaped["isOwner"] = item.get("createdBy") == user_id
    return shaped


# --- Role / ownership enforcement -------------------------------------------
# custom:role defaults to MEMBER (deny-by-default) if the claim is somehow
# missing, rather than assuming the more privileged LEAD.

def require_lead(role):
    """Returns an error response if the caller is not a LEAD, else None."""
    if role != 'LEAD':
        return get_response(403, {"error": "Only department leads can perform this action"})
    return None


def get_owned_item(table, item_id, department, user_id, role):
    """Fetch an item and verify:
      1. it belongs to the caller's department, and
      2. the caller is either a LEAD (can manage anything in the department)
         or the item's original creator (MEMBERs can only touch their own uploads).
    Returns (item, None) on success, or (None, error_response) to return immediately."""
    res = table.get_item(Key={'id': item_id})
    item = res.get('Item')
    if not item:
        return None, get_response(404, {"error": "Item not found"})
    if item.get('department') != department:
        return None, get_response(403, {"error": "You don't have permission to modify this item"})
    if role != 'LEAD' and item.get('createdBy') != user_id:
        return None, get_response(403, {"error": "You can only modify items you created"})
    return item, None


def handler(event, context):
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')

    if http_method == 'OPTIONS':
        return get_response(200, {"message": "CORS preflight OK"})

    req_context = event.get('requestContext') or {}
    authorizer = req_context.get('authorizer') or {}
    claims = authorizer.get('claims') or {}

    department = claims.get('custom:department', 'General')
    user_id = claims.get('sub', 'anonymous')
    role = claims.get('custom:role', 'MEMBER')

    try:
        table = get_table()

        # 1. GET /public-feed
        if path.endswith('/public-feed') and http_method == 'GET':
            try:
                res = table.query(
                    IndexName='VisibilityIndex',
                    KeyConditionExpression=Key('visibility').eq('PUBLIC')
                )
                items = res.get('Items', [])
            except Exception as gsi_err:
                print(f"GSI Query failed, falling back to scan: {gsi_err}")
                res = table.scan(FilterExpression=Attr('visibility').eq('PUBLIC'))
                items = res.get('Items', [])

            return get_response(200, [shape_public(i) for i in items])

        # 2. GET /department/workspace
        if path.endswith('/department/workspace') and http_method == 'GET':
            res = table.scan(FilterExpression=Attr('department').eq(department))
            items = res.get('Items', [])
            return get_response(200, [shape_workspace(i, user_id) for i in items])

        # 3. PUT /department/visibility
        if path.endswith('/department/visibility') and http_method == 'PUT':
            body = json.loads(event.get('body') or '{}')
            item_id = body.get('id') or body.get('intern_id')
            new_vis = body.get('visibility', 'PRIVATE')

            if not item_id:
                return get_response(400, {"error": "Missing item ID"})

            _, err = get_owned_item(table, item_id, department, user_id, role)
            if err:
                return err

            table.update_item(
                Key={'id': item_id},
                UpdateExpression="SET visibility = :v",
                ExpressionAttributeValues={':v': new_vis}
            )
            return get_response(200, {"message": "Visibility updated successfully"})

        # 4. POST /department/interns — LEAD only
        if path.endswith('/department/interns') and http_method == 'POST':
            err = require_lead(role)
            if err:
                return err

            body = json.loads(event.get('body') or '{}')
            item_id = str(uuid.uuid4())

            item = {
                'id': item_id,
                'intern_id': item_id,
                'type': 'PROFILE',
                'name': body.get('name', ''),
                'field': body.get('field', ''),
                'school': body.get('school', ''),
                'avatarUrl': body.get('avatarUrl'),
                'department': department,
                'visibility': body.get('visibility', 'PRIVATE'),
                'createdBy': user_id,
                'createdAt': datetime.utcnow().isoformat()
            }
            table.put_item(Item=item)
            return get_response(200, shape_workspace(item, user_id))

        # 5. PUT /department/interns/{id} — partial update of profile fields
        if '/department/interns/' in path and http_method == 'PUT':
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')
            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            existing, err = get_owned_item(table, item_id, department, user_id, role)
            if err:
                return err
            if existing.get('type') != 'PROFILE':
                return get_response(400, {"error": "This item is not an intern profile"})

            body = json.loads(event.get('body') or '{}')
            editable = {'name', 'field', 'school', 'avatarUrl'}
            updates = {k: v for k, v in body.items() if k in editable and v is not None}
            if not updates:
                return get_response(400, {"error": "No editable fields provided"})

            expr_names = {f"#{k}": k for k in updates}
            expr_values = {f":{k}": v for k, v in updates.items()}
            update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in updates)

            table.update_item(
                Key={'id': item_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return get_response(200, {"message": "Profile updated successfully"})

        # 6. DELETE /department/interns/{id}
        if '/department/interns/' in path and http_method == 'DELETE':
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')

            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            _, err = get_owned_item(table, item_id, department, user_id, role)
            if err:
                return err

            table.delete_item(Key={'id': item_id})
            return get_response(200, {"message": "Item deleted successfully"})

        # 7. POST /department/gallery (presigned S3 upload for a gallery photo)
        # Open to both roles — only intern creation and cross-user editing are LEAD-gated.
        if path.endswith('/department/gallery') and http_method == 'POST':
            body = json.loads(event.get('body') or '{}')
            file_name = body.get('fileName', f"{uuid.uuid4()}.jpg")
            file_type = body.get('fileType', 'image/jpeg')

            s3_key = f"departments/{department}/gallery/{uuid.uuid4()}_{file_name}"
            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET_NAME, 'Key': s3_key, 'ContentType': file_type},
                ExpiresIn=300
            )

            item_id = str(uuid.uuid4())
            image_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"

            item = {
                'id': item_id,
                'intern_id': item_id,
                'type': 'PHOTO',
                'caption': body.get('caption', ''),
                'imageUrl': image_url,
                'department': department,
                'visibility': body.get('visibility', 'PRIVATE'),
                'createdBy': user_id,
                'createdAt': datetime.utcnow().isoformat()
            }
            table.put_item(Item=item)

            return get_response(200, {
                "uploadUrl": presigned_url,
                "id": item_id,
                "imageUrl": image_url
            })

        # 8. PUT /department/gallery/{id} — caption edit
        if '/department/gallery/' in path and http_method == 'PUT':
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')
            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            existing, err = get_owned_item(table, item_id, department, user_id, role)
            if err:
                return err
            if existing.get('type') != 'PHOTO':
                return get_response(400, {"error": "This item is not a gallery photo"})

            body = json.loads(event.get('body') or '{}')
            caption = body.get('caption')
            if caption is None:
                return get_response(400, {"error": "Missing caption"})

            table.update_item(
                Key={'id': item_id},
                UpdateExpression="SET caption = :c",
                ExpressionAttributeValues={':c': caption}
            )
            return get_response(200, {"message": "Caption updated successfully"})

        # 9. POST /department/avatar-upload-url (presigned S3 upload for an intern avatar)
        # Two-step, mirrors gallery upload: caller PUTs the file to S3 with the returned
        # uploadUrl, then POSTs/PUTs the resulting avatarUrl onto an intern profile.
        # LEAD-only, matching intern creation — a MEMBER has no intern-profile action to attach this to.
        if path.endswith('/department/avatar-upload-url') and http_method == 'POST':
            err = require_lead(role)
            if err:
                return err

            body = json.loads(event.get('body') or '{}')
            file_name = body.get('fileName', f"{uuid.uuid4()}.jpg")
            file_type = body.get('fileType', 'image/jpeg')

            s3_key = f"departments/{department}/avatars/{uuid.uuid4()}_{file_name}"
            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET_NAME, 'Key': s3_key, 'ContentType': file_type},
                ExpiresIn=300
            )
            avatar_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"

            return get_response(200, {
                "uploadUrl": presigned_url,
                "avatarUrl": avatar_url
            })

        return get_response(404, {"error": f"Route not found: {path}"})

    except Exception as e:
        print(f"Unhandled Exception in Handler: {str(e)}")
        return get_response(500, {"error": str(e)})
