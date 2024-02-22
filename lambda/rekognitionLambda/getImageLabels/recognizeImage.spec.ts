import { type RekognitionClient } from '@aws-sdk/client-rekognition'
import { check, objectMatching } from 'tsmatchers'
import { describe, it, mock } from 'node:test'
import { recognizeImage } from './recognizeImage.js'
import assert from 'node:assert/strict'

void describe('recognizeImage()', () => {
	void it('should get labels by using rekognition', async () => {
		const key = 'key'
		const bucket = 'bucketName'
		const minConfidence = 50
		const rekognitionSend = mock.fn(async () =>
			Promise.resolve({ Labels: [{ Name: 'cat' }, { Name: 'mammal' }] }),
		)
		const rekog: RekognitionClient = {
			send: rekognitionSend,
		} as any
		await recognizeImage(rekog, bucket, minConfidence)(key)
		check((rekognitionSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					Image: {
						S3Object: {
							Bucket: bucket,
							Name: key,
						},
					},
					MaxLabels: 10,
					MinConfidence: 50,
				},
			}),
		)
	})
	void it('should return labels in the correct format', async () => {
		const key = 'key'
		const bucket = 'bucketName'
		const minConfidence = 50
		const rekognitionSend = mock.fn(async () =>
			Promise.resolve({ Labels: [{ Name: 'cat' }, { Name: 'mammal' }] }),
		)
		const rekog: RekognitionClient = {
			send: rekognitionSend,
		} as any
		const expectedResult = [{ Name: 'cat' }, { Name: 'mammal' }]
		assert.deepEqual(
			await recognizeImage(rekog, bucket, minConfidence)(key),
			expectedResult,
		)
	})
})
