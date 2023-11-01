# Serverless training

This is a project following the serverless training given in [this series](https://pages.awscloud.com/global-traincert-twitch-dev-hour-building-modern-applications.html). The series has been followed, but some changes have been made:

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
npx cdk --app 'npx tsx cdk/ci.ts' deploy
```

This creates a role with Administrator privileges in that account, and allows
the GitHub repository of this repo to assume it.

Create a GitHub environment `ci`.

Store the role name from the output as a GitHub Action secret:

```bash
CI_ROLE_ARN=`aws cloudformation describe-stacks --stack-name ${STACK_NAME:-public-parameter-registry}-ci | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "roleArn") | .OutputValue' | sed -E 's/\/$//g'`
gh variable set AWS_REGION --env ci --body "${AWS_REGION}"
gh secret set AWS_ROLE --env ci --body "${CI_ROLE_ARN}"
```
