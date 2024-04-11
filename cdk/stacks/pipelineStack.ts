import {
	CodePipeline,
	CodePipelineSource,
	ShellStep,
} from 'aws-cdk-lib/pipelines'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { type Repository } from '../resources/CD.js'
import { aws_iam as IAM } from 'aws-cdk-lib'
import { Effect } from 'aws-cdk-lib/aws-iam'

export class AwsdevhourBackendPipelineStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: { repository: Repository }) {
		super(scope, id)

		/*const codePipelineRole = new IAM.Role(this, 'role', {
			roleName: 'codePipelineRole',
			assumedBy: new IAM.ServicePrincipal('codepipeline.amazonaws.com'),
			managedPolicies: [
				IAM.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
			],
		})
		codePipelineRole.addToPolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				resources: ['*'],
				actions: [
					'iam:GetOpenIDConnectProvider',
					'iam:ListOpenIDConnectProviders',
				],
			}),
		)*/
		new CodePipeline(this, 'Pipeline', {
			pipelineName: 'MyPipeline',
			//role: codePipelineRole.withoutPolicyUpdates(),
			synth: new ShellStep('Synth', {
				/*input: CodePipelineSource.gitHub(
					`${props.repository.owner}/${props.repository.repo}`,
					'saga',
					{
						authentication: cdk.SecretValue.secretsManager(
							'devhour-backend-git-token',
						),
					},
				),*/

				input: CodePipelineSource.connection(
					`${props.repository.owner}/${props.repository.repo}`,
					'deployment-pipeline',
					{
						connectionArn: cdk.SecretValue.secretsManager(
							'codestar-connection-MyConnection3',
						).toString(),
					},
				),
				installCommands: ['npm install -g aws-cdk'],
				commands: [
					'npm ci',
					'cd layers/sharp/nodejs && npm ci && cd ../../..',
					'npm run build',
					'npx cdk synth',
				],
			}),
			synthCodeBuildDefaults: {
				rolePolicy: [
					new IAM.PolicyStatement({
						effect: Effect.ALLOW,
						resources: ['*'],
						actions: [
							'iam:GetOpenIDConnectProvider',
							'iam:ListOpenIDConnectProviders',
						],
					}),
				],
			},
		})
	}
}
