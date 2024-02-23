import { RekognitionClient } from '@aws-sdk/client-rekognition'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromEnv } from '@nordicsemiconductor/from-env'
import type {
	S3Event,
	S3EventRecord,
	SNSEvent,
	SNSEventRecord,
} from 'aws-lambda'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { getImageLabels } from './rekognitionLambda/getImageLabels/getImageLabels.js'
import { getLabelsByEtag } from './rekognitionLambda/getImageLabels/getLabelsByEtag.js'
import { storeLabelsInDynamoDB } from './rekognitionLambda/storeLabels/storeLabelsInDynamoDB.js'
import { recognizeImage } from './rekognitionLambda/getImageLabels/recognizeImage.js'
import { storeLabelsInCacheDynamoDB } from './rekognitionLambda/storeLabels/storeLabelsInCacheDynamoDB.js'

const RekogClient = new RekognitionClient({ region: 'us-east-2' })
const db = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(db)

const { Table, HashTable, Bucket } = fromEnv({
	Table: 'TABLE',
	HashTable: 'HASHTABLE',
	Bucket: 'BUCKET',
})(process.env)
const minConfidence = 50

const getImageLabelsFunc = getImageLabels({
	getLabelsByEtag: getLabelsByEtag(docClient, HashTable),
	recognizeImage: recognizeImage(RekogClient, Bucket, minConfidence),
	storeLabelsInCacheDynamoDB: storeLabelsInCacheDynamoDB(db, HashTable),
})
const storeLabels = storeLabelsInDynamoDB(db, Table)

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
					const eTag = element.s3.object.eTag
					const labels = await getImageLabelsFunc(eTag, bucketKey)
					if (labels === undefined) {
						console.error({ error: new Error('Could not find labels') })
						return
					}
					console.log(labels)
					const store = await storeLabels(labels, bucketKey)
					if ('error' in store) {
						console.error({
							error: new Error(
								'Error when trying to store the labels in dynamoDB',
							),
						})
					}
				}) ?? [],
			)
		}),
	)
}
