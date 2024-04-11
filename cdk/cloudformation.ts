import { AwsDevHourStack } from './stacks/aws_dev_hour-stack.js'
import { App } from 'aws-cdk-lib'
import pJSON from '../package.json'
import { ensureGitHubOIDCProvider } from './ensureGitHubOIDCProvider.js'
import { IAMClient } from '@aws-sdk/client-iam'
import { AwsdevhourBackendPipelineStack } from './stacks/pipelineStack.js'

const repoUrl = new URL(pJSON.repository.url)
const repository = {
	owner: repoUrl.pathname.split('/')[1] ?? 'Lenakh97',
	repo:
		repoUrl.pathname.split('/')[2]?.replace(/\.git$/, '') ??
		'serverlessAWStraining',
}

const iam = new IAMClient({})

export type Repository = {
	owner: string
	repo: string
}

export class AwsDevHourApp extends App {
	public constructor({
		repository,
		gitHubOIDCProviderArn,
		version,
	}: {
		repository: Repository
		gitHubOIDCProviderArn: string
		version: string
	}) {
		super({
			context: {
				version,
			},
		})

		new AwsDevHourStack(this, {
			repository,
			gitHubOIDCProviderArn,
		})
		new AwsdevhourBackendPipelineStack(this, 'AwsdevhourBackendPipelineStack', {
			repository,
		})
	}
}

new AwsDevHourApp({
	repository,
	gitHubOIDCProviderArn: await ensureGitHubOIDCProvider({
		iam,
	}),
	version: process.env.VERSION ?? '0.0.0-development',
})
