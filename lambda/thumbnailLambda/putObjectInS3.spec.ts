import type { S3Client } from '@aws-sdk/client-s3'
import { mock, describe, it } from 'node:test'
import { check, objectMatching } from 'tsmatchers'
import { putObjectInS3 } from './putObjectInS3.js'

void describe('putObjectInS3()', () => {
	void it('should send a GetObjectCommand with the correct parameters', async () => {
		const bucketName = 'bucket'
		const thumbKey = 'key'
		const buffer = Buffer.alloc(10)
		const s3Send = mock.fn(async () => Promise.resolve())
		const s3: S3Client = {
			send: s3Send,
		} as any
		await putObjectInS3(s3, bucketName)(buffer, thumbKey)
		check((s3Send.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					Body: buffer,
					Bucket: bucketName,
					Key: thumbKey,
				},
			}),
		)
	})
})
