import {
	CloudFormationClient,
	DescribeStackResourcesCommand,
} from '@aws-sdk/client-cloudformation'
import {
	DeleteObjectCommand,
	ListObjectsCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import chalk from 'chalk'
import { STACK_NAME } from '../../cdk/stackConfig.js'
import { paginate } from '../util/paginate.js'
import type { CommandDefinition } from './CommandDefinition.js'
import { retry } from './retry.js'
const cf = new CloudFormationClient({})

const listBuckets = async (StackName: string) =>
	cf
		.send(new DescribeStackResourcesCommand({ StackName }))

		.then(
			(res) =>
				res?.StackResources?.filter(
					({ ResourceType }) => ResourceType === 'AWS::S3::Bucket',
				).map(({ PhysicalResourceId }) => PhysicalResourceId as string) ?? [],
		)
		.catch(({ message }) => {
			console.warn(chalk.yellow.dim(message))
			return []
		})

export const purgeBucketObjectsCommand = (): CommandDefinition => ({
	command: 'purge-bucket-objects',
	action: async () => {
		const buckets = [...(await listBuckets(STACK_NAME))]
		const s3 = new S3Client({})
		await Promise.all(
			buckets
				.filter((b) => b)
				.map(async (bucketName) => {
					console.log(
						chalk.magenta.dim('Purging bucket objects'),
						chalk.blue.dim(bucketName),
					)
					try {
						await retry(
							3,
							() => 5000,
						)(async () => {
							await paginate({
								paginator: async (nextMarker?: string) => {
									const { Contents, Marker } = await s3.send(
										new ListObjectsCommand({
											Bucket: bucketName,
											Marker: nextMarker,
										}),
									)

									if (!Contents) {
										console.log(chalk.green.dim(`${bucketName} is empty.`))
									} else {
										await Promise.all(
											Contents.map(async (obj) => {
												console.log(
													chalk.magenta.dim(bucketName),
													chalk.blue.dim(obj.Key),
												)
												return s3.send(
													new DeleteObjectCommand({
														Bucket: bucketName,
														Key: `${obj.Key}`,
													}),
												)
											}),
										)
									}
									return Marker
								},
							})
						})
					} catch (err) {
						console.error(
							chalk.yellow.dim(
								`Failed to purge bucket objects in ${bucketName}: ${
									(err as Error).message
								}`,
							),
						)
					}
				}),
		)
	},
	help: 'Purges all S3 bucket objects (used during CI runs)',
})
