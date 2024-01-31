import { App, CfnOutput, Duration, aws_iam as IAM, Stack } from 'aws-cdk-lib'
import { CI_STACK_NAME } from '../stackConfig.js'

export class CIStack extends Stack {
	public constructor(
		parent: App,
		{
			repository: r,
			gitHubOIDCProviderArn,
		}: {
			repository: {
				owner: string
				repo: string
			}
			gitHubOIDCProviderArn: string
		},
	) {
		super(parent, CI_STACK_NAME)
		const gitHubOIDC = IAM.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
			this,
			'gitHubOIDCProvider',
			gitHubOIDCProviderArn,
		)
		const ghRole = new IAM.Role(this, 'ghRole', {
			roleName: `${CI_STACK_NAME}`,
			assumedBy: new IAM.WebIdentityPrincipal(
				gitHubOIDC.openIdConnectProviderArn,
				{
					StringEquals: {
						'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
						'token.actions.githubusercontent.com:sub': `repo:${r.owner}/${r.repo}:environment:ci`,
					},
				},
			),
			description: `This role is used by Github Actions for CI or ${r.owner}/${r.repo}`,
			maxSessionDuration: Duration.hours(1),
			managedPolicies: [
				IAM.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
			],
		})

		new CfnOutput(this, 'roleArn', {
			exportName: `${this.stackName}:roleArn`,
			description: 'Role to use in Github Actions',
			value: ghRole.roleArn,
		})
	}
}

export type StackOutputs = {
	roleArn: string
}
