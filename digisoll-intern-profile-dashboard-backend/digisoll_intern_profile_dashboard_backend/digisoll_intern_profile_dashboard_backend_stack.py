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

        # 1. Single Table
        table = dynamodb.Table(
            self, "DigisolAppTable",
            partition_key=dynamodb.Attribute(name="pk", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        table.add_global_secondary_index(
            index_name="PublicVisibilityIndex",
            partition_key=dynamodb.Attribute(name="visibility", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="created_at", type=dynamodb.AttributeType.STRING)
        )

        # 2. S3 Bucket
        gallery_bucket = s3.Bucket(
            self, "DigisolGalleryBucket",
            public_read_access=True,
            block_public_access=s3.BlockPublicAccess(
                block_public_acls=False,
                ignore_public_acls=False,
                block_public_policy=False,
                restrict_public_buckets=False
            ),
            cors=[s3.CorsRule(
                allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE],
                allowed_origins=["*"],
                allowed_headers=["*"]
            )],
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        # 3. Cognito User Pool
        user_pool = cognito.UserPool(
            self, "DigisolUserPool",
            user_pool_name="digisol-user-pool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            custom_attributes={
                "department": cognito.StringAttribute(mutable=True),
                "role": cognito.StringAttribute(mutable=True)
            },
            removal_policy=RemovalPolicy.DESTROY
        )

        user_pool_client = user_pool.add_client(
            "DigisolUserPoolClient",
            generate_secret=False,
            read_attributes=cognito.ClientAttributes().with_custom_attributes("department", "role"),
            write_attributes=cognito.ClientAttributes().with_custom_attributes("department", "role")
        )

        # 4. Lambda Function
        backend_lambda = _lambda.Function(
            self, "BackendHandler",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.handler",
            code=_lambda.Code.from_asset("lambda"),
            environment={
                "TABLE_NAME": table.table_name,
                "BUCKET_NAME": gallery_bucket.bucket_name
            }
        )

        table.grant_read_write_data(backend_lambda)
        gallery_bucket.grant_read_write(backend_lambda)

        # 5. API Gateway
        api = apigw.RestApi(
            self, "DigisolApi",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
            )
        )

        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self, "ApiAuthorizer",
            cognito_user_pools=[user_pool]
        )

        auth_options = {
            "authorizer": authorizer,
            "authorization_type": apigw.AuthorizationType.COGNITO
        }

        integration = apigw.LambdaIntegration(backend_lambda)

        api.root.add_resource("public-feed").add_method("GET", integration, **auth_options)
        
        dept = api.root.add_resource("department")
        dept.add_resource("workspace").add_method("GET", integration, **auth_options)
        dept.add_resource("interns").add_method("POST", integration, **auth_options)
        dept.add_resource("photos").add_method("POST", integration, **auth_options)
        
        items = dept.add_resource("items")
        items.add_method("PUT", integration, **auth_options)
        items.add_method("DELETE", integration, **auth_options)

        dept.add_resource("visibility").add_method("PUT", integration, **auth_options)

        CfnOutput(self, "ApiEndpointUrl", value=api.url)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)