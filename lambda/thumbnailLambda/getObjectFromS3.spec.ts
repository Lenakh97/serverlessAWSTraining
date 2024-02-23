import type { S3Client } from '@aws-sdk/client-s3'
import { mock, describe, it } from 'node:test'
import { getObjectFromS3 } from './getObjectFromS3.js'
import { check, objectMatching } from 'tsmatchers'

void describe('getObjectFromS3()', () => {
	void it('should send a GetObjectCommand with the correct parameters', async () => {
		const bucketName = 'bucket'
		const bucketKey = 'key'
		const s3Send = mock.fn(async () => Promise.resolve())
		const s3: S3Client = {
			send: s3Send,
		} as any
		await getObjectFromS3(s3, bucketName)(bucketKey)
		check((s3Send.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					Bucket: bucketName,
					Key: bucketKey,
				},
			}),
		)
	})
})
