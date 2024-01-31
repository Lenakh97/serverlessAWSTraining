import { IAMClient } from '@aws-sdk/client-iam'
import pJSON from '../../package.json'
import { CIApp } from '../CIApp.js'
import { ensureGitHubOIDCProvider } from '../ensureGitHubOIDCProvider.js'

const repoUrl = new URL(pJSON.repository.url)
const repository = {
	owner: repoUrl.pathname.split('/')[1] ?? 'Lenakh97',
	repo:
		repoUrl.pathname.split('/')[2]?.replace(/\.git$/, '') ??
		'serverlessAWSTraining',
}
new CIApp({
	repository,
	gitHubOIDCProviderArn: await ensureGitHubOIDCProvider({
		iam: new IAMClient({}),
	}),
})
