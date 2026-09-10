# Digisol intern photo gallery infrastructure

This is a blank project for CDK development with Python.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

This project is set up like a standard Python project. The initialization
process also creates a virtualenv within this project, stored under the `.venv`
directory. To create the virtualenv it assumes that there is a `python3`
(or `python` for Windows) executable in your path with access to the `venv`
package. If for any reason the automatic creation of the virtualenv fails,
you can create the virtualenv manually.

To manually create a virtualenv on MacOS and Linux:

```
$ python -m venv .venv
```

After the init process completes and the virtualenv is created, you can use the following
step to activate your virtualenv.

```
$ source .venv/bin/activate
```

If you are a Windows platform, you would activate the virtualenv like this:

```
% .venv\Scripts\activate.bat
```

Once the virtualenv is activated, you can install the required dependencies.

```
$ pip install -r requirements.txt
```

At this point you can now synthesize the CloudFormation template for this code.

```
$ cdk synth
```

To add additional dependencies, for example other CDK libraries, just add
them to your `requirements.txt` file and rerun the `python -m pip install -r requirements.txt`
command.

## Useful commands

- `cdk ls` list all stacks in the app
- `cdk synth` emits the synthesized CloudFormation template
- `cdk deploy DigisolInternPhotoGalleryStack` deploy the photo gallery stack
- `cdk diff` compare deployed stack with current state
- `cdk docs` open CDK documentation

Enjoy!

## Department-scoped dashboards

The Lambda reads the authenticated Cognito claims supplied by the API Gateway
authorizer. Every newly created intern is stamped with the user's Cognito
`sub` as `owner_id`. Department users can only list, view, update, and delete
their own records. Users in the Cognito `admin` group can view and manage all
records through the general dashboard.

Configure the `/interns` routes with a Cognito authorizer and add trusted
administrators to the `admin` user group. Do not send `owner_id` from the
frontend; the backend derives it from the verified token. Existing records
without `owner_id` are visible only to admins and should be assigned or
migrated before department users need access to them.

## Photo gallery

The gallery uses the separate `DigisolInternPhotos` table with
`VisibilityIndex` and `DepartmentIndex`, plus a private S3 bucket managed by
`DigisolInternPhotoGalleryStack`. Gallery images are stored under
`private/<department>/` until published, then moved to `public/gallery/`.
Lambda returns signed image URLs, so private prefixes are not publicly
readable.

Available authenticated routes are `GET /photos/general`,
`GET /photos/department`, `POST /photos`, and
`PUT /photos/{id}/publish`. The frontend must be published from the
`digisol-intern-profile-dashboard` project after its changes are committed to
the connected Amplify branch.
