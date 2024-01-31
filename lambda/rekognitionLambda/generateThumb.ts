import {
	PutObjectCommand,
	GetObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { streamToBuffer } from './streamToBuffer.js'
import { replaceSubstringWithColon } from '../util/replaceSubstringWithColon.js'
// eslint-disable-next-line
import * as sharpModule from '/opt/nodejs/node_modules/sharp' // Uses the location of the module IN the layer

export const sharp = sharpModule.default

export const generateThumb =
	(s3: S3Client) =>
	async (
		ourBucket: string,
		ourKey: string,
	): Promise<{ success: boolean } | { error: Error }> => {
		// Clean the string to add the colon back into requested name
		const safeKey = replaceSubstringWithColon(ourKey)
		const safeKeyThumb = safeKey.replace('photos', 'thumbnails')

		// Download file from s3 and store it in buffer
		const image = await s3.send(
			new GetObjectCommand({
				Bucket: ourBucket,
				Key: safeKey,
			}),
		)

		if (image === undefined) {
			return { error: new Error(`Image not found in bucket ${ourBucket}`) }
		}

		const stream = image.Body as Readable
		const buffer = await streamToBuffer(stream)

		const resizedImage = await sharp(buffer).resize(200).toBuffer()
		if (resizedImage === undefined) {
			return { error: new Error(`Failed to resize image.`) }
		}

		//Upload the thumbnail to the bucket
		const uploadThumb = await s3.send(
			new PutObjectCommand({
				Body: resizedImage,
				Bucket: ourBucket,
				Key: safeKeyThumb,
			}),
		)
		if (uploadThumb === undefined) {
			return {
				error: new Error(
					`Failed to upload thumbnail image to bucket: ${ourBucket}`,
				),
			}
		}

		return { success: true }
	}
