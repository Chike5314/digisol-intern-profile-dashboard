from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    aws_dynamodb as dynamodb,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_cognito as cognito,
)
from constructs import Construct

class DigisollInternProfileDashboardBackendStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. DynamoDB Table
        interns_table = dynamodb.Table(
            self, "DigisolInternsTableV2",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # GSI for public items query
        interns_table.add_global_secondary_index(
            index_name="VisibilityIndex",
            partition_key=dynamodb.Attribute(name="visibility", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="createdAt", type=dynamodb.AttributeType.STRING)
        )

        # 2. S3 Bucket
        image_bucket = s3.Bucket(
            self, "DigisolStorageBucketV2",
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=True,
                ignore_public_acls=True,
                block_public_policy=False,
                restrict_public_buckets=False
            ),
            public_read_access=True,
            cors=[s3.CorsRule(
                allowed_methods=[
                    s3.HttpMethods.GET,
                    s3.HttpMethods.PUT,
                    s3.HttpMethods.POST,
                    s3.HttpMethods.DELETE
                ],
                allowed_origins=["*"],
                allowed_headers=["*"]
            )],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # 3. Import Existing User Pool (Avoids re-creating Domain and Google IDP collisions)
        user_pool = cognito.UserPool.from_user_pool_id(
            self, "ImportedUserPool",
            user_pool_id="us-east-1_v6PErV1cG"
        )

        # User Pool Client Definition
        user_pool_client = cognito.UserPoolClient(
            self, "DigisolUserPoolClientV2",
            user_pool=user_pool,
            user_pool_client_name="digisol-interns-web-client-v2",
            generate_secret=False,
            read_attributes=cognito.ClientAttributes().with_standard_attributes(email=True).with_custom_attributes("department", "role"),
            write_attributes=cognito.ClientAttributes().with_standard_attributes(email=True).with_custom_attributes("department", "role"),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO,
                cognito.UserPoolClientIdentityProvider.GOOGLE,
            ],
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                    implicit_code_grant=True
                ),
                scopes=[
                    cognito.OAuthScope.COGNITO_ADMIN,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.PROFILE
                ],
                callback_urls=[
                    "http://localhost:5173/",
                    "https://main.d3co7r5b8ec1sd.amplifyapp.com/"
                ],
                logout_urls=[
                    "http://localhost:5173/",
                    "https://main.d3co7r5b8ec1sd.amplifyapp.com/"
                ],
            )
        )

        # 4. Lambda Function
        crud_lambda = _lambda.Function(
            self, "DigisolCrudHandlerV2",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.handler",
            code=_lambda.Code.from_asset("lambda"),
            environment={
                "TABLE_NAME": interns_table.table_name,
                "BUCKET_NAME": image_bucket.bucket_name
            }
        )

        interns_table.grant_read_write_data(crud_lambda)
        image_bucket.grant_read_write(crud_lambda)

        # 5. REST API Gateway
        api = apigw.RestApi(
            self, "DigisolInternApiV2",
            rest_api_name="Digisol Intern Service V2",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token"
                ]
            )
        )

        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self, "DigisolAuthorizerV2",
            cognito_user_pools=[user_pool]
        )

        auth_opts = {
            "authorizer": authorizer,
            "authorization_type": apigw.AuthorizationType.COGNITO
        }

        integration = apigw.LambdaIntegration(crud_lambda)

        # --- Route Definitions ---
        public_feed = api.root.add_resource("public-feed")
        public_feed.add_method("GET", integration)

        dept = api.root.add_resource("department")
        
        dept_workspace = dept.add_resource("workspace")
        dept_workspace.add_method("GET", integration, **auth_opts)

        dept_vis = dept.add_resource("visibility")
        dept_vis.add_method("PUT", integration, **auth_opts)

        dept_interns = dept.add_resource("interns")
        dept_interns.add_method("POST", integration, **auth_opts)
        intern_item = dept_interns.add_resource("{id}")
        intern_item.add_method("PUT", integration, **auth_opts)
        intern_item.add_method("DELETE", integration, **auth_opts)

        dept_gallery = dept.add_resource("gallery")
        dept_gallery.add_method("POST", integration, **auth_opts)
        gallery_item = dept_gallery.add_resource("{id}")
        gallery_item.add_method("PUT", integration, **auth_opts)

        dept_avatar = dept.add_resource("avatar-upload-url")
        dept_avatar.add_method("POST", integration, **auth_opts)

        # Outputs
        CfnOutput(self, "ApiEndpointUrl", value=api.url)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)