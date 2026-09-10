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


def dept_slug(department):
    return (department or "").strip().lower()


def department_key(department):
    return f"DEPARTMENT#{dept_slug(department)}"


def membership_key(department, user_id):
    return f"MEMBERSHIP#{dept_slug(department)}#{user_id}"


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
    """Fields visible to a member of the SAME department, managing their own workspace."""
    shaped = shape_public(item)
    shaped["createdBy"] = item.get("createdBy")
    shaped["createdAt"] = item.get("createdAt")
    shaped["isOwner"] = item.get("createdBy") == user_id
    return shaped


def shape_pending_member(item):
    return {
        "userId": item.get("userId"),
        "userEmail": item.get("userEmail"),
        "createdAt": item.get("createdAt"),
    }


# --- Role / ownership / membership enforcement ------------------------------
# custom:role defaults to MEMBER (deny-by-default) if the claim is somehow
# missing, rather than assuming the more privileged LEAD.

def require_lead(role):
    if role != 'LEAD':
        return get_response(403, {"error": "Only department leads can perform this action"})
    return None


def get_owned_item(table, item_id, department, user_id, role):
    """Fetch an item and verify:
      1. it belongs to the caller's department, and
      2. the caller is either a LEAD (can manage anything in the department)
         or the item's original creator (MEMBERs can only touch their own uploads)."""
    res = table.get_item(Key={'id': item_id})
    item = res.get('Item')
    if not item:
        return None, get_response(404, {"error": "Item not found"})
    if item.get('department') != department:
        return None, get_response(403, {"error": "You don't have permission to modify this item"})
    if role != 'LEAD' and item.get('createdBy') != user_id:
        return None, get_response(403, {"error": "You can only modify items you created"})
    return item, None


def require_department_access(table, role, user_id, department):
    """Gate for every /department/* action that isn't part of the registration/
    approval flow itself. VISITORs never get department access. LEADs are
    trusted for their own department. MEMBERs need an APPROVED membership
    record — pending or rejected requests, or no request at all, are blocked."""
    if role == 'VISITOR':
        return get_response(403, {"error": "Visitor accounts don't have department access"})
    if role == 'LEAD':
        return None
    if role == 'MEMBER':
        res = table.get_item(Key={'id': membership_key(department, user_id)})
        membership = res.get('Item')
        if not membership or membership.get('status') != 'APPROVED':
            return get_response(403, {
                "error": "Your membership request for this department is still pending approval",
                "membershipStatus": membership.get('status') if membership else 'NONE'
            })
        return None
    return get_response(403, {"error": "Unrecognized account role"})


def handler(event, context):
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')

    if http_method == 'OPTIONS':
        return get_response(200, {"message": "CORS preflight OK"})

    req_context = event.get('requestContext') or {}
    authorizer = req_context.get('authorizer') or {}
    claims = authorizer.get('claims') or {}

    department = claims.get('custom:department', '')
    user_id = claims.get('sub', 'anonymous')
    user_email = claims.get('email', '')
    role = claims.get('custom:role', 'MEMBER')

    try:
        table = get_table()

        # 1. GET /public-feed — fully public, no auth required, no role check.
        # This is also how a VISITOR account (or anyone) browses without a department.
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

        # 2. GET /departments — public, unauthenticated. Powers the sign-up dropdown
        # so MEMBER accounts can only pick a department that actually has a LEAD.
        if path.endswith('/departments') and http_method == 'GET':
            res = table.scan(FilterExpression=Attr('type').eq('DEPARTMENT'))
            names = sorted(i.get('name') for i in res.get('Items', []) if i.get('name'))
            return get_response(200, names)

        # 3. POST /department/register — LEAD only. Creates the department registry
        # entry that makes this department name selectable by future MEMBER sign-ups.
        # Idempotent for the same lead; rejects a second lead claiming the same name.
        if path.endswith('/department/register') and http_method == 'POST':
            err = require_lead(role)
            if err:
                return err
            if not department:
                return get_response(400, {"error": "No department set on this account"})

            key = department_key(department)
            existing = table.get_item(Key={'id': key}).get('Item')
            if existing and existing.get('leadUserId') != user_id:
                return get_response(409, {
                    "error": "This department name already has a registered lead. Choose a different department name."
                })
            if existing:
                return get_response(200, {"message": "Already registered", "department": department})

            table.put_item(Item={
                'id': key,
                'type': 'DEPARTMENT',
                'name': department,
                'leadUserId': user_id,
                'createdAt': datetime.utcnow().isoformat()
            })
            return get_response(200, {"message": "Department registered", "department": department})

        # 4. POST /department/membership-request — MEMBER only. Requests to join
        # their chosen department; the department must already be registered
        # (have a lead) or this is rejected outright — no ghost/isolated members.
        if path.endswith('/department/membership-request') and http_method == 'POST':
            if role != 'MEMBER':
                return get_response(400, {"error": "Only member accounts submit membership requests"})
            if not department:
                return get_response(400, {"error": "No department set on this account"})

            dept_exists = table.get_item(Key={'id': department_key(department)}).get('Item')
            if not dept_exists:
                return get_response(400, {
                    "error": "This department doesn't exist yet. Ask your department lead to sign up first, or choose a different department."
                })

            key = membership_key(department, user_id)
            existing = table.get_item(Key={'id': key}).get('Item')
            if existing:
                return get_response(200, {"status": existing.get('status', 'PENDING')})

            table.put_item(Item={
                'id': key,
                'type': 'MEMBERSHIP',
                'userId': user_id,
                'userEmail': user_email,
                'department': department,
                'status': 'PENDING',
                'createdAt': datetime.utcnow().isoformat()
            })
            return get_response(200, {"status": "PENDING"})

        # 5. GET /department/my-membership-status — MEMBER polls their own approval state.
        if path.endswith('/department/my-membership-status') and http_method == 'GET':
            if role != 'MEMBER':
                return get_response(200, {"status": "NOT_APPLICABLE"})
            if not department:
                return get_response(200, {"status": "NONE"})
            item = table.get_item(Key={'id': membership_key(department, user_id)}).get('Item')
            return get_response(200, {"status": item.get('status', 'NONE') if item else 'NONE'})

        # 6. GET /department/pending-members — LEAD only, scoped to their own department.
        if path.endswith('/department/pending-members') and http_method == 'GET':
            err = require_lead(role)
            if err:
                return err
            res = table.scan(
                FilterExpression=Attr('type').eq('MEMBERSHIP') & Attr('department').eq(department) & Attr('status').eq('PENDING')
            )
            return get_response(200, [shape_pending_member(i) for i in res.get('Items', [])])

        # 7. PUT /department/pending-members/{userId} — LEAD approves/rejects a request.
        if '/department/pending-members/' in path and http_method == 'PUT':
            err = require_lead(role)
            if err:
                return err
            path_params = event.get('pathParameters') or {}
            target_user_id = path_params.get('userId')
            if not target_user_id:
                return get_response(400, {"error": "Missing userId in path"})

            body = json.loads(event.get('body') or '{}')
            new_status = body.get('status')
            if new_status not in ('APPROVED', 'REJECTED'):
                return get_response(400, {"error": "status must be APPROVED or REJECTED"})

            key = membership_key(department, target_user_id)
            existing = table.get_item(Key={'id': key}).get('Item')
            if not existing:
                return get_response(404, {"error": "Membership request not found"})

            table.update_item(
                Key={'id': key},
                UpdateExpression="SET #st = :s",
                ExpressionAttributeNames={'#st': 'status'},
                ExpressionAttributeValues={':s': new_status}
            )
            return get_response(200, {"message": f"Member {new_status.lower()}"})

        # --- Everything below requires real department access: LEAD, or an
        # APPROVED MEMBER. VISITORs and unapproved MEMBERs are blocked here. ---

        # 8. GET /department/workspace
        if path.endswith('/department/workspace') and http_method == 'GET':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
            res = table.scan(FilterExpression=Attr('department').eq(department) & Attr('type').is_in(['PROFILE', 'PHOTO']))
            items = res.get('Items', [])
            return get_response(200, [shape_workspace(i, user_id) for i in items])

        # 9. PUT /department/visibility
        if path.endswith('/department/visibility') and http_method == 'PUT':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
            body = json.loads(event.get('body') or '{}')
            item_id = body.get('id') or body.get('intern_id')
            new_vis = body.get('visibility', 'PRIVATE')

            if not item_id:
                return get_response(400, {"error": "Missing item ID"})

            _, owner_err = get_owned_item(table, item_id, department, user_id, role)
            if owner_err:
                return owner_err

            table.update_item(
                Key={'id': item_id},
                UpdateExpression="SET visibility = :v",
                ExpressionAttributeValues={':v': new_vis}
            )
            return get_response(200, {"message": "Visibility updated successfully"})

        # 10. POST /department/interns — LEAD only
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

        # 11. PUT /department/interns/{id} — partial update of profile fields
        if '/department/interns/' in path and http_method == 'PUT':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')
            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            existing, owner_err = get_owned_item(table, item_id, department, user_id, role)
            if owner_err:
                return owner_err
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

        # 12. DELETE /department/interns/{id}
        if '/department/interns/' in path and http_method == 'DELETE':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')

            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            _, owner_err = get_owned_item(table, item_id, department, user_id, role)
            if owner_err:
                return owner_err

            table.delete_item(Key={'id': item_id})
            return get_response(200, {"message": "Item deleted successfully"})

        # 13. POST /department/gallery (presigned S3 upload for a gallery photo)
        if path.endswith('/department/gallery') and http_method == 'POST':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
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

        # 14. PUT /department/gallery/{id} — caption edit
        if '/department/gallery/' in path and http_method == 'PUT':
            err = require_department_access(table, role, user_id, department)
            if err:
                return err
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')
            if not item_id:
                return get_response(400, {"error": "Missing ID in path"})

            existing, owner_err = get_owned_item(table, item_id, department, user_id, role)
            if owner_err:
                return owner_err
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

        # 15. POST /department/avatar-upload-url — LEAD only, matching intern creation
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
