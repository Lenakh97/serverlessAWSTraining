import { RekognitionClient } from '@aws-sdk/client-rekognition'
import {
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb'
import { fromEnv } from '@nordicsemiconductor/from-env'
import { S3Client } from '@aws-sdk/client-s3'

import { rekognitionFunction } from './rekognitionLambda/rekognitionFunction.js'
import { generateThumb } from './rekognitionLambda/generateThumb.js'
import type { S3Event, S3EventRecord, SQSEvent, SQSRecord } from 'aws-lambda'
import { replaceSubstringWithColon } from './util/replaceSubstringWithColon.js'

const RekogClient = new RekognitionClient({ region: 'us-east-2' })
const db = new DynamoDBClient({})
const s3 = new S3Client({})

const { Table, HashTable } = fromEnv({
	Table: 'TABLE',
	HashTable: 'HASHTABLE',
})(process.env)

const rekogFunction = rekognitionFunction(db, RekogClient)
const generateThumbnail = generateThumb(s3)

export const handler = async (event: SQSEvent): Promise<void> => {
	console.log(JSON.stringify({ event }))
	const records = event.Records
	console.log(JSON.stringify({ records }))
	await Promise.all(
		records.map(async (payload: SQSRecord) => {
			const eventInfo = JSON.parse(payload.body) as S3Event
			await Promise.all(
				eventInfo?.Records?.map(async (element: S3EventRecord) => {
					const bucketName = element.s3.bucket.name
					const bucketKey = element.s3.object.key
					const eTag = element.s3.object.eTag

					const maybeThumbnail = await generateThumbnail(bucketName, bucketKey)
					if ('error' in maybeThumbnail) {
						console.error('Error generateThumb():', maybeThumbnail.error)
					}

					//Check if image has been through rekognition earlier
					const maybeLabels = await db.send(
						new QueryCommand({
							TableName: HashTable,
							KeyConditionExpression: 'hashTable = :key',
							ExpressionAttributeValues: {
								':key': { S: eTag },
							},
						}),
					)
					//If no labels found, run image through rekognition
					if (maybeLabels === undefined || maybeLabels.Count === 0) {
						const maybeRekognition = await rekogFunction(
							bucketName,
							bucketKey,
							Table,
							HashTable,
							eTag,
						)
						if ('error' in maybeRekognition) {
							console.error(
								'Error rekognitionFunction(): ',
								maybeRekognition.error,
							)
						}
					} else {
						//Labels are in hash table

						const safeKey = replaceSubstringWithColon(bucketKey)
						//upload Labels to dynamodb
						const uploadLabels = await db.send(
							new PutItemCommand({
								TableName: Table,
								Item: {
									...maybeLabels.Items?.[0],
									image: { S: safeKey },
								},
							}),
						)
						if (uploadLabels === undefined) {
							console.error(
								'error:',
								new Error(`Failed to upload labels to table: ${Table}`),
							)
						}
					}
				}) ?? [],
			)
		}),
	)
}
