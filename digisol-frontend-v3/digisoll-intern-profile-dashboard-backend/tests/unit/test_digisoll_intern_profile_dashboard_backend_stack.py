import aws_cdk as core
import aws_cdk.assertions as assertions

from digisoll_intern_profile_dashboard_backend.digisoll_intern_profile_dashboard_backend_stack import DigisollInternProfileDashboardBackendStack

# example tests. To run these tests, uncomment this file along with the example
# resource in digisoll_intern_profile_dashboard_backend/digisoll_intern_profile_dashboard_backend_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = DigisollInternProfileDashboardBackendStack(app, "digisoll-intern-profile-dashboard-backend")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
