import { Readable } from 'stream'
import { streamToBuffer } from './streamToBuffer.js'
import { replaceSubstringWithColon } from '../util/replaceSubstringWithColon.js'
import type { GetObjectCommandOutput } from '@aws-sdk/client-s3'

export const generateThumb =
	({
		getObjectFromS3,
		imageThumbnail,
	}: {
		getObjectFromS3: (ourKey: string) => Promise<GetObjectCommandOutput | null>
		imageThumbnail: (image: Buffer, size: number) => Promise<Buffer | void>
	}) =>
	async (
		ourBucket: string,
		ourKey: string,
	): Promise<{ success: Buffer } | { error: Error }> => {
		// Clean the string to add the colon back into requested name
		const safeKey = replaceSubstringWithColon(ourKey)

		// Download file from s3 and store it in buffer
		const image = await getObjectFromS3(safeKey)
		if (image === null) {
			return { error: new Error(`Image not found in bucket ${ourBucket}`) }
		}

		const stream = image.Body as Readable
		const buffer = await streamToBuffer(stream)

		const resizedImage = await imageThumbnail(buffer, 200)
		if (resizedImage === undefined) {
			return { error: new Error(`Failed to resize image.`) }
		}
		return { success: resizedImage }
	}
