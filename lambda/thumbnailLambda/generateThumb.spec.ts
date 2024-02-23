import { describe, it } from 'node:test'
import { generateThumb } from './generateThumb.js'
import assert from 'node:assert/strict'
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'

void describe('generateThumb()', () => {
	void it('should return an error if downloading of image from s3 failes', async () => {
		const bucket = 'bucket'
		const key = 'key'
		const bufferMock = Buffer.from('imageThumbnail')

		const generateThumbnail = generateThumb({
			getObjectFromS3: async () => Promise.resolve(null),
			imageThumbnail: async () => Promise.resolve(bufferMock),
		})
		assert.deepEqual(await generateThumbnail(bucket, key), {
			error: new Error(`Image not found in bucket ${bucket}`),
		})
	})
	void it('should return an error if image resizing failes', async () => {
		const bucket = 'bucket'
		const key = 'key'
		const readable = new Readable()
		readable.push('bucket')
		readable.push(null)

		const generateThumbnail = generateThumb({
			getObjectFromS3: async () =>
				Promise.resolve({
					Body: readable,
				} as unknown as GetObjectCommandOutput),
			imageThumbnail: async () => Promise.resolve(),
		})
		assert.deepEqual(await generateThumbnail(bucket, key), {
			error: new Error(`Failed to resize image.`),
		})
	})
})
