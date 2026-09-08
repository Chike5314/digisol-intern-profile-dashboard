import json
import os
import uuid
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

TABLE_NAME = os.environ.get('TABLE_NAME')
BUCKET_NAME = os.environ.get('BUCKET_NAME')
table = dynamodb.Table(TABLE_NAME)

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

def handler(event, context):
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')

    if http_method == 'OPTIONS':
        return get_response(200, {"message": "CORS preflight OK"})

    # Parse Cognito Claims
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    department = claims.get('custom:department', 'General')
    user_id = claims.get('sub', 'anonymous')

    try:
        # 1. GET /public-feed
        if path.endswith('/public-feed') and http_method == 'GET':
            res = table.query(
                IndexName='VisibilityIndex',
                KeyConditionExpression=Key('visibility').eq('PUBLIC')
            )
            return get_response(200, res.get('Items', []))

        # 2. GET /department/workspace
        if path.endswith('/department/workspace') and http_method == 'GET':
            res = table.scan(
                FilterExpression=Attr('department').eq(department)
            )
            return get_response(200, res.get('Items', []))

        # 3. PUT /department/visibility
        if path.endswith('/department/visibility') and http_method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            item_id = body.get('id')
            new_vis = body.get('visibility', 'PRIVATE')

            table.update_item(
                Key={'id': item_id},
                UpdateExpression="SET visibility = :v",
                ExpressionAttributeValues={':v': new_vis}
            )
            return get_response(200, {"message": "Visibility updated"})

        # 4. POST /department/interns
        if path.endswith('/department/interns') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            item_id = str(uuid.uuid4())
            
            item = {
                'id': item_id,
                'type': 'PROFILE',
                'name': body.get('name'),
                'field': body.get('field'),
                'school': body.get('school'),
                'department': department,
                'visibility': body.get('visibility', 'PRIVATE'),
                'createdBy': user_id,
                'createdAt': datetime.utcnow().isoformat()
            }
            table.put_item(Item=item)
            return get_response(200, item)

        # 5. DELETE /department/interns/{id}
        if '/department/interns/' in path and http_method == 'DELETE':
            path_params = event.get('pathParameters') or {}
            item_id = path_params.get('id')
            
            table.delete_item(Key={'id': item_id})
            return get_response(200, {"message": "Item deleted"})

        # 6. POST /department/gallery (Presigned S3 Upload)
        if path.endswith('/department/gallery') and http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            file_name = body.get('fileName', f"{uuid.uuid4()}.jpg")
            file_type = body.get('fileType', 'image/jpeg')

            s3_key = f"departments/{department}/{uuid.uuid4()}_{file_name}"
            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET_NAME, 'Key': s3_key, 'ContentType': file_type},
                ExpiresIn=300
            )

            item_id = str(uuid.uuid4())
            image_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"

            # Save Photo Metadata to DynamoDB
            table.put_item(Item={
                'id': item_id,
                'type': 'PHOTO',
                'caption': body.get('caption', ''),
                'imageUrl': image_url,
                'department': department,
                'visibility': body.get('visibility', 'PRIVATE'),
                'createdBy': user_id,
                'createdAt': datetime.utcnow().isoformat()
            })

            return get_response(200, {
                "uploadUrl": presigned_url,
                "id": item_id,
                "imageUrl": image_url
            })

        return get_response(404, {"error": "Route not found"})

    except Exception as e:
        return get_response(500, {"error": str(e)})