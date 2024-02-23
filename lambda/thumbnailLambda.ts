import { fromEnv } from '@nordicsemiconductor/from-env'
import { S3Client } from '@aws-sdk/client-s3'
import { generateThumb } from './thumbnailLambda/generateThumb.js'
import type {
	S3Event,
	S3EventRecord,
	SNSEvent,
	SNSEventRecord,
} from 'aws-lambda'
import { getObjectFromS3 } from './thumbnailLambda/getObjectFromS3.js'
import { putObjectInS3 } from './thumbnailLambda/putObjectInS3.js'
// eslint-disable-next-line
import * as sharpModule from '/opt/nodejs/node_modules/sharp' // Uses the location of the module IN the layer

export const sharp = sharpModule.default

const s3 = new S3Client({})

const { Bucket } = fromEnv({
	Bucket: 'BUCKET',
})(process.env)

const putObjectInS3Func = putObjectInS3(s3, Bucket)

const generateThumbnail = generateThumb({
	getObjectFromS3: getObjectFromS3(s3, Bucket),
	imageThumbnail: async (image, width) => sharp(image).resize(width).toBuffer(),
})

export const handler = async (event: SNSEvent): Promise<void> => {
	console.log(JSON.stringify({ event }))
	const records = event.Records
	console.log(JSON.stringify({ records }))
	await Promise.all(
		records.map(async (payload: SNSEventRecord) => {
			const eventInfo = JSON.parse(payload.Sns.Message) as S3Event
			await Promise.all(
				eventInfo?.Records?.map(async (element: S3EventRecord) => {
					const bucketKey = element.s3.object.key
					const thumbKey = bucketKey.replace('photos', 'thumbnails')
					const maybeThumbnail = await generateThumbnail(Bucket, bucketKey)
					if ('error' in maybeThumbnail) {
						console.error('Error generateThumb():', maybeThumbnail.error)
					} else {
						const storeThumb = await putObjectInS3Func(
							maybeThumbnail.success,
							thumbKey,
						)
						if ('error' in storeThumb) {
							console.error({
								error: new Error(
									'Error when trying to store the labels in dynamoDB',
								),
							})
						}
					}
				}) ?? [],
			)
		}),
	)
}
