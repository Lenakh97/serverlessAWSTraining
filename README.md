# Serverless training

This is a project following the serverless training given in
[this series](https://pages.awscloud.com/global-traincert-twitch-dev-hour-building-modern-applications.html).
The series has been followed, but some changes have been made:

- All python code is transformed into typescript
- Unit tests and e2e tests are added during development
- CI/CD is set up using OpenID Connect

## Installation in your AWS account

### Setup

Provide your AWS credentials, for example using the `.envrc` file.

Install the dependencies:

```bash
npm ci
```

### Deploy

```bash
export STACK_NAME="AwsDevHourStack"
npx cdk deploy
```

### CD with GitHub Actions

Create a github environment `production`.

Store the role name from the output as a GitHub Action secret:

```bash
CD_ROLE_ARN=`aws cloudformation describe-stacks --stack-name ${STACK_NAME:-AwsDevHourStack} | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "cdRoleArn") | .OutputValue' | sed -E 's/\/$//g'`
gh variable set AWS_REGION --env production --body "${AWS_REGION}"
gh secret set AWS_ROLE --env production --body "${CD_ROLE_ARN}"
# If you've used a custom stack name
gh variable set STACK_NAME --env production --body "${STACK_NAME}"
```

## CI with GitHub Actions

Configure the AWS credentials for an account used for CI, then run

```bash
npx cdk --app 'npx tsx cdk/resources/ci.ts' deploy
```

This creates a role with Administrator privileges in that account, and allows
the GitHub repository of this repo to assume it.

Create a GitHub environment `ci`.

Store the role name from the output as a GitHub Action secret:

```bash
CI_ROLE_ARN=`aws cloudformation describe-stacks --stack-name ${STACK_NAME:-AwsDevHourStack}-ci | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "roleArn") | .OutputValue' | sed -E 's/\/$//g'`
gh variable set AWS_REGION --env ci --body "${AWS_REGION}"
gh secret set AWS_ROLE --env ci --body "${CI_ROLE_ARN}"
```

## Deployment Pipeline

To use the deployment pipeline you need to set up a
[connection](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html).

This can be done in the CLI:

```bash
aws codeconnections create-connection --provider-type GitHub --connection-name MyConnection
```

This will return the ConnectionArn in the following format

{ "ConnectionArn":
"arn:aws:codeconnections:us-west-2:account_id:connection/aEXAMPLE-8aad-4d5d-8878-dfcab0bc441f"
}

This ARN is then placed in secrets manager:

```bash
aws secretsmanager create-secret --name <name> --secret-string <secret>
```

To finish the connection you need to use the
[console](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-update.html).
