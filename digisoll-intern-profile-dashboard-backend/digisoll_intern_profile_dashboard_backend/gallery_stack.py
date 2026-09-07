from pathlib import Path

from aws_cdk import CfnOutput, Duration, RemovalPolicy, Stack, aws_apigateway as apigateway, aws_cognito as cognito, aws_dynamodb as dynamodb, aws_iam as iam, aws_lambda as lambda_
from aws_cdk import aws_s3 as s3
from constructs import Construct


class DigisolInternPhotoGalleryStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        def indexed_table(id_, partition_key):
            table = dynamodb.Table(self, id_, partition_key=dynamodb.Attribute(name=partition_key, type=dynamodb.AttributeType.STRING), billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST, removal_policy=RemovalPolicy.RETAIN)
            table.add_global_secondary_index(index_name="PublicVisibilityIndex", partition_key=dynamodb.Attribute(name="visibility", type=dynamodb.AttributeType.STRING), sort_key=dynamodb.Attribute(name="created_at", type=dynamodb.AttributeType.STRING))
            table.add_global_secondary_index(index_name="DepartmentIndex", partition_key=dynamodb.Attribute(name="department", type=dynamodb.AttributeType.STRING), sort_key=dynamodb.Attribute(name="created_at", type=dynamodb.AttributeType.STRING))
            return table

        interns = indexed_table("InternsTable", "intern_id")
        photos = indexed_table("PhotosTable", "image_id")
        bucket = s3.Bucket(self, "GalleryBucket", block_public_access=s3.BlockPublicAccess.BLOCK_ALL, enforce_ssl=True, cors=[s3.CorsRule(allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT], allowed_origins=["*"], allowed_headers=["*"])], removal_policy=RemovalPolicy.RETAIN)
        user_pool = cognito.UserPool(self, "DepartmentUserPool", self_sign_up_enabled=True, sign_in_aliases=cognito.SignInAliases(email=True), custom_attributes={"department": cognito.StringAttribute(min_len=1, max_len=100, mutable=False)})
        client = user_pool.add_client("WebClient", auth_flows=cognito.AuthFlow(user_srp=True), generate_secret=False)

        handler = lambda_.Function(self, "PortalHandler", runtime=lambda_.Runtime.PYTHON_3_12, handler="handler.handler", code=lambda_.Code.from_asset(str(Path(__file__).parents[1] / "lambda")), timeout=Duration.seconds(30), environment={"INTERNS_TABLE_NAME": interns.table_name, "PHOTOS_TABLE_NAME": photos.table_name, "BUCKET_NAME": bucket.bucket_name})
        interns.grant_read_write_data(handler)
        photos.grant_read_write_data(handler)
        bucket.grant_read_write(handler)

        api = apigateway.RestApi(self, "PortalApi", default_cors_preflight_options=apigateway.CorsOptions(allow_origins=apigateway.Cors.ALL_ORIGINS, allow_methods=apigateway.Cors.ALL_METHODS, allow_headers=["Content-Type", "Authorization"]))
        gateway_response_headers = {
            "Access-Control-Allow-Origin": "'*'",
            "Access-Control-Allow-Headers": "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE,OPTIONS'",
        }
        api.add_gateway_response(
            "Default4XXResponse",
            type=apigateway.ResponseType.DEFAULT_4_XX,
            response_headers=gateway_response_headers,
        )
        api.add_gateway_response(
            "Default5XXResponse",
            type=apigateway.ResponseType.DEFAULT_5_XX,
            response_headers=gateway_response_headers,
        )
        integration = apigateway.LambdaIntegration(handler)
        authorizer = apigateway.CognitoUserPoolsAuthorizer(self, "DepartmentAuthorizer", cognito_user_pools=[user_pool])
        auth = {"authorization_type": apigateway.AuthorizationType.COGNITO, "authorizer": authorizer}
        public = api.root.add_resource("public")
        public.add_resource("interns").add_method("GET", integration)
        public.add_resource("gallery").add_method("GET", integration)
        api.root.add_resource("public-feed").add_method("GET", integration, **auth)
        department = api.root.add_resource("department")
        department_interns = department.add_resource("interns")
        department_interns.add_method("GET", integration, **auth)
        department_interns.add_method("POST", integration, **auth)
        intern = department_interns.add_resource("{id}")
        intern.add_method("PUT", integration, **auth)
        intern.add_method("DELETE", integration, **auth)
        gallery = department.add_resource("gallery")
        gallery.add_method("GET", integration, **auth)
        gallery.add_method("POST", integration, **auth)
        department.add_resource("workspace").add_method("GET", integration, **auth)
        department.add_resource("visibility").add_method("PUT", integration, **auth)
        department.add_resource("publish").add_method("PUT", integration, **auth)

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=client.user_pool_client_id)
