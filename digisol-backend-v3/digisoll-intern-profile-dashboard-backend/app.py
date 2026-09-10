#!/usr/bin/env python3
import aws_cdk as cdk
from digisoll_intern_profile_dashboard_backend.digisoll_intern_profile_dashboard_backend_stack import DigisollInternProfileDashboardBackendStack

app = cdk.App()
DigisollInternProfileDashboardBackendStack(app, "DigisollInternProfileDashboardBackendStack")

app.synth()