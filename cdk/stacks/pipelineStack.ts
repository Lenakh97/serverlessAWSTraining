import {
	CodePipeline,
	CodePipelineSource,
	ShellStep,
} from 'aws-cdk-lib/pipelines'
import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import type { Repository } from '../resources/CD'

export class AwsdevhourBackendPipelineStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: { repository: Repository }) {
		super(scope, id)

		new CodePipeline(this, 'Pipeline', {
			pipelineName: 'MyPipeline',
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
					'saga',
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
		})
	}
}
