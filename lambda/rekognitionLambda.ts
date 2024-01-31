import { RekognitionClient } from '@aws-sdk/client-rekognition'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromEnv } from '@nordicsemiconductor/from-env'
import { S3Client } from '@aws-sdk/client-s3'

import { rekognitionFunction } from './rekognitionLambda/rekognitionFunction.js'
import { generateThumb } from './rekognitionLambda/generateThumb.js'
import type { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'

const RekogClient = new RekognitionClient({ region: 'us-east-2' })
const db = new DynamoDBClient({})
const s3 = new S3Client({})

const { Table } = fromEnv({
	Table: 'TABLE',
})(process.env)

const rekogFunction = rekognitionFunction(db, RekogClient)
const generateThumbnail = generateThumb(s3)

export const handler = async (event: SQSEvent): Promise<void> => {
	console.log('Lambda processing event: ')
	const records = event.Records
	await Promise.all(
		records.map(async (payload: SQSRecord) => {
			const eventInfo = JSON.parse(payload.body) as S3Event
			await Promise.all(
				eventInfo?.Records?.map(async (element: S3EventRecord) => {
					const bucketName = element.s3.bucket.name
					const bucketKey = element.s3.object.key
					const maybeThumbnail = await generateThumbnail(bucketName, bucketKey)
					if ('error' in maybeThumbnail) {
						console.error('Error generateThumb():', maybeThumbnail.error)
					}
					const maybeRekognition = await rekogFunction(
						bucketName,
						bucketKey,
						Table,
					)
					if ('error' in maybeRekognition) {
						console.error(
							'Error rekognitionFunction(): ',
							maybeRekognition.error,
						)
					}
				}) ?? [],
			)
		}),
	)
}
