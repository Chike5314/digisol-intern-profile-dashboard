import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key


dynamodb = boto3.resource("dynamodb")
interns_table = dynamodb.Table(os.environ["INTERNS_TABLE_NAME"])
photos_table = dynamodb.Table(os.environ["PHOTOS_TABLE_NAME"])
s3 = boto3.client("s3")
bucket_name = os.environ["BUCKET_NAME"]


def handler(event, _context):
    method = event.get("httpMethod", "")
    path = event.get("resource") or event.get("path", "")
    stage = event.get("requestContext", {}).get("stage")
    if stage and path.startswith(f"/{stage}/"):
        path = path[len(stage) + 1:]
    if not path.startswith("/"):
        path = f"/{path}"

    if method == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    try:
        if method == "GET" and path == "/public/interns":
            return response(200, public_interns())
        if method == "GET" and path == "/public/gallery":
            return response(200, public_photos())
        if method == "GET" and path == "/public-feed":
            return response(200, typed_items(public_interns(), "PROFILE") + typed_items(public_photos(), "PHOTO"))

        claims = claims_from(event)
        if not claims.get("sub"):
            return response(401, {"error": "Authentication required"})
        actor = {"id": claims["sub"], "department": department_from(claims), "admin": is_admin(claims)}

        if method == "GET" and path == "/department/interns":
            return response(200, department_interns(actor))
        if method == "GET" and path == "/department/workspace":
            return response(200, typed_items(department_interns(actor), "PROFILE") + typed_items(department_photos(actor), "PHOTO"))
        if method == "POST" and path == "/department/interns":
            return response(201, create_intern(body(event), actor))
        if method == "PUT" and path == "/department/interns/{id}":
            return update_intern(event["pathParameters"]["id"], body(event), actor)
        if method == "DELETE" and path == "/department/interns/{id}":
            return delete_intern(event["pathParameters"]["id"], actor)
        if method == "GET" and path == "/department/gallery":
            return response(200, department_photos(actor))
        if method == "POST" and path == "/department/gallery":
            return response(201, create_photo(body(event), actor))
        if method == "PUT" and path in {"/department/publish", "/department/visibility"}:
            return change_visibility(body(event), actor)
        return response(404, {"error": "Route not found"})
    except (KeyError, ValueError, json.JSONDecodeError):
        return response(400, {"error": "Invalid request"})
    except Exception:
        return response(500, {"error": "Internal server error"})


def claims_from(event):
    authorizer = event.get("requestContext", {}).get("authorizer", {})
    return authorizer.get("claims", {}) or authorizer.get("jwt", {}).get("claims", {})


def department_from(claims):
    return (claims.get("custom:department") or "General").strip() or "General"


def is_admin(claims):
    groups = claims.get("cognito:groups", [])
    if isinstance(groups, str):
        groups = groups.split(",")
    return "admin" in groups or "department-admin" in groups


def body(event):
    return json.loads(event.get("body") or "{}")


def now():
    return datetime.now(timezone.utc).isoformat()


def typed_items(items, item_type):
    return [{**item, "type": item_type} for item in items]


def public_interns():
    result = interns_table.query(IndexName="PublicVisibilityIndex", KeyConditionExpression=Key("visibility").eq("PUBLIC"), ScanIndexForward=False)
    return [intern_view(item) for item in result.get("Items", [])]


def department_interns(actor):
    result = interns_table.query(IndexName="DepartmentIndex", KeyConditionExpression=Key("department").eq(actor["department"]), ScanIndexForward=False)
    return [intern_view(item) for item in result.get("Items", [])]


def create_intern(data, actor):
    item = {"intern_id": str(uuid.uuid4()), "department": actor["department"], "owner_id": actor["id"], "name": data.get("name", "").strip(), "field": data.get("field", "").strip(), "school": data.get("school", "").strip(), "imageUrl": data.get("imageUrl", ""), "visibility": "PRIVATE", "created_at": now()}
    if not item["name"]:
        raise ValueError("Name is required")
    interns_table.put_item(Item=item)
    return intern_view(item)


def update_intern(intern_id, data, actor):
    item = interns_table.get_item(Key={"intern_id": intern_id}).get("Item")
    if not item or item.get("department") != actor["department"]:
        return response(404, {"error": "Intern not found"})
    if item.get("owner_id") != actor["id"] and not actor["admin"]:
        return response(403, {"error": "Department admin access is required"})
    updates = {key: data[key] for key in ("name", "field", "school", "imageUrl") if key in data}
    if not updates:
        return response(400, {"error": "No changes supplied"})
    intern = {**item, **updates}
    interns_table.put_item(Item=intern)
    return response(200, intern_view(intern))


def delete_intern(intern_id, actor):
    item = interns_table.get_item(Key={"intern_id": intern_id}).get("Item")
    if not item or item.get("department") != actor["department"]:
        return response(404, {"error": "Intern not found"})
    if item.get("owner_id") != actor["id"] and not actor["admin"]:
        return response(403, {"error": "Department admin access is required"})
    interns_table.delete_item(Key={"intern_id": intern_id})
    return response(200, {"message": "Intern deleted"})


def public_photos():
    result = photos_table.query(IndexName="PublicVisibilityIndex", KeyConditionExpression=Key("visibility").eq("PUBLIC"), ScanIndexForward=False)
    return [photo_view(item) for item in result.get("Items", [])]


def department_photos(actor):
    result = photos_table.query(IndexName="DepartmentIndex", KeyConditionExpression=Key("department").eq(actor["department"]), ScanIndexForward=False)
    return [photo_view(item) for item in result.get("Items", [])]


def create_photo(data, actor):
    photo_id = str(uuid.uuid4())
    file_name = os.path.basename(data.get("fileName", "photo"))
    key = f"departments/{actor['department']}/{photo_id}-{file_name}"
    item = {"image_id": photo_id, "department": actor["department"], "owner_id": actor["id"], "caption": data.get("caption", ""), "visibility": "PRIVATE", "created_at": now(), "s3_key": key}
    photos_table.put_item(Item=item)
    photo = photo_view(item)
    photo["uploadUrl"] = s3.generate_presigned_url("put_object", Params={"Bucket": bucket_name, "Key": key, "ContentType": data.get("fileType", "image/jpeg")}, ExpiresIn=900)
    return photo


def change_visibility(data, actor):
    target = interns_table if data.get("type") == "INTERN_PROFILE" else photos_table if data.get("type") == "IMAGE" else None
    key_name = "intern_id" if data.get("type") == "INTERN_PROFILE" else "image_id"
    if not target or data.get("visibility") not in {"PUBLIC", "PRIVATE"}:
        return response(400, {"error": "Invalid publication request"})
    item = target.get_item(Key={key_name: data.get("id")}).get("Item")
    if not item or item.get("department") != actor["department"]:
        return response(404, {"error": "Item not found"})
    if item.get("owner_id") != actor["id"] and not actor["admin"]:
        return response(403, {"error": "Department admin access is required"})
    item["visibility"] = data["visibility"]
    target.put_item(Item=item)
    return response(200, intern_view(item) if key_name == "intern_id" else photo_view(item))


def intern_view(item):
    return {key: item.get(key, "") for key in ("intern_id", "name", "field", "school", "imageUrl", "department", "visibility")}


def photo_view(item):
    key = item.get("s3_key", "")
    return {"id": item.get("image_id"), "caption": item.get("caption", ""), "department": item.get("department", ""), "visibility": item.get("visibility", "PRIVATE"), "imageUrl": s3.generate_presigned_url("get_object", Params={"Bucket": bucket_name, "Key": key}, ExpiresIn=900) if key else ""}


def response(status, payload):
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization"}, "body": json.dumps(payload, default=str)}
