import { RekognitionClient } from '@aws-sdk/client-rekognition'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromEnv } from '@nordicsemiconductor/from-env'
import { S3Client } from '@aws-sdk/client-s3'
import { generateThumb } from './rekognitionLambda/generateThumb.js'
import type { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { getImageLabels } from './rekognitionLambda/getImageLabels/getImageLabels.js'
import { getLabelsByEtag } from './rekognitionLambda/getImageLabels/getLabelsByEtag.js'
import { storeLabelsInDynamoDB } from './rekognitionLambda/storeLabels/storeLabelsInDynamoDB.js'
import { recognizeImage } from './rekognitionLambda/getImageLabels/recognizeImage.js'
import { storeLabelsInCacheDynamoDB } from './rekognitionLambda/storeLabels/storeLabelsInCacheDynamoDB.js'

const RekogClient = new RekognitionClient({ region: 'us-east-2' })
const db = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(db)

const s3 = new S3Client({})

const { Table, HashTable, Bucket } = fromEnv({
	Table: 'TABLE',
	HashTable: 'HASHTABLE',
	Bucket: 'BUCKET',
})(process.env)
const minConfidence = 50

const generateThumbnail = generateThumb(s3)
const getImageLabelsFunc = getImageLabels({
	getLabelsByEtag: getLabelsByEtag(docClient, HashTable),
	recognizeImage: recognizeImage(RekogClient, Bucket, minConfidence),
	storeLabelsInCacheDynamoDB: storeLabelsInCacheDynamoDB(db, HashTable),
})
const storeLabels = storeLabelsInDynamoDB(db, Table)

export const handler = async (event: SQSEvent): Promise<void> => {
	console.log(JSON.stringify({ event }))
	const records = event.Records
	console.log(JSON.stringify({ records }))
	await Promise.all(
		records.map(async (payload: SQSRecord) => {
			const eventInfo = JSON.parse(payload.body) as S3Event
			await Promise.all(
				eventInfo?.Records?.map(async (element: S3EventRecord) => {
					const bucketKey = element.s3.object.key
					const eTag = element.s3.object.eTag

					//  TODO: move to a separate lambda, so it does not block
					const maybeThumbnail = await generateThumbnail(Bucket, bucketKey)
					if ('error' in maybeThumbnail) {
						console.error('Error generateThumb():', maybeThumbnail.error)
					}
					const labels = await getImageLabelsFunc(eTag, bucketKey)
					if (labels === undefined) {
						console.error({ error: new Error('Could not find labels') })
						return
					}
					console.log(labels)
					const store = await storeLabels(labels, bucketKey)
					if ('error' in store) {
						console.error({ error: new Error('error') })
					}
				}) ?? [],
			)
		}),
	)
}
