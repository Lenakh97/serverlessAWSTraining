import { Duration, aws_iam as IAM, Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'

export type Repository = {
	owner: string
	repo: string
}
export class CD extends Construct {
	public readonly role: IAM.IRole
	constructor(
		parent: Stack,
		{
			repository: r,
			gitHubOIDC,
		}: {
			repository: Repository
			gitHubOIDC: IAM.IOpenIdConnectProvider
		},
	) {
		super(parent, 'cd')

		this.role = new IAM.Role(this, 'ghRole', {
			roleName: `${parent.stackName}-github-actions`,
			assumedBy: new IAM.WebIdentityPrincipal(
				gitHubOIDC.openIdConnectProviderArn,
				{
					StringEquals: {
						'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
						'token.actions.githubusercontent.com:sub': `repo:${r.owner}/${r.repo}:environment:production`,
					},
				},
			),
			description: `This role is used by GitHub Actions for CI of ${r.owner}/${r.repo}`,
			maxSessionDuration: Duration.hours(1),
			managedPolicies: [
				IAM.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
			],
		})
	}
}
