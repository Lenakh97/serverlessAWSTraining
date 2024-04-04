import { AwsdevhourBackendPipelineStage } from '../pipelineStage.js'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import {
	CodePipeline,
	CodePipelineSource,
	ShellStep,
} from 'aws-cdk-lib/pipelines'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class AwsdevhourBackendPipelineStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props)

		const gitHubOwner = ssm.StringParameter.valueForStringParameter(
			this,
			'devhour-backend-git-owner',
		)

		const githubRepo = ssm.StringParameter.valueForStringParameter(
			this,
			'devhour-backend-git-repo',
		)

		const githubBranch = ssm.StringParameter.valueForStringParameter(
			this,
			'devhour-backend-git-branch',
		)

		const pipeline = new CodePipeline(this, 'Pipeline', {
			pipelineName: 'MyPipeline',
			synth: new ShellStep('Synth', {
				input: CodePipelineSource.gitHub(
					`${gitHubOwner}/${githubRepo}`,
					githubBranch,
					{
						authentication: cdk.SecretValue.secretsManager(
							'devhour-backend-git-token',
						),
					},
				),
				installCommands: ['npm install -g aws-cdk'],
				commands: [
					'npm ci',
					'npm run build',
					'cd layers/sharp/nodejs && npm ci && cd ../../..',
					'npx cdk synth',
				],
			}),
		})

		pipeline.addStage(new AwsdevhourBackendPipelineStage(this, 'devStage'))
	}
}
