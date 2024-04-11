import {
	CodeBuildStep,
	CodePipeline,
	CodePipelineSource,
} from 'aws-cdk-lib/pipelines'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { type Repository } from '../resources/CD.js'
import { aws_iam as IAM } from 'aws-cdk-lib'

export class AwsdevhourBackendPipelineStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: { repository: Repository }) {
		super(scope, id)

		new CodePipeline(this, 'Pipeline', {
			pipelineName: 'MyPipeline2',
			synth: new CodeBuildStep('Synth', {
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
				rolePolicyStatements: [
					new IAM.PolicyStatement({
						resources: ['arn:aws:iam::*:oidc-provider/*'],
						actions: [
							'iam:GetOpenIDConnectProvider',
							'iam:ListOpenIDConnectProviders',
						],
					}),
				],
			}),
		})
	}
}
