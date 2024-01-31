import { describe, it, mock } from 'node:test'
import { check, objectMatching } from 'tsmatchers'
import { deleteImageFromBucket } from './deleteImageFromBucket.js'
import type { S3Client } from '@aws-sdk/client-s3'

void describe('deleteImageFromBucket()', () => {
	const key = 'key'
	const bucket = 'bucketName'
	void it('should use AWS DynamoDBClient to delete image from S3 Bucket', async () => {
		const s3Send = mock.fn()
		const s3: S3Client = {
			send: s3Send,
		} as any
		await deleteImageFromBucket(s3)(bucket, key)

		//Check that the correct command is used?

		//check that the function is called with the correct arguments
		check((s3Send.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					Bucket: bucket,
					Key: key,
				},
			}),
		)
	})
})
