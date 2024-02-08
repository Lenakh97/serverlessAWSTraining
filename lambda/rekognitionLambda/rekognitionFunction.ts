import {
	DetectLabelsCommand,
	RekognitionClient,
} from '@aws-sdk/client-rekognition'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { replaceSubstringWithColon } from '../util/replaceSubstringWithColon.js'

// min confidence for amazon rekognition
export const minConfidence = 50

export const rekognitionFunction =
	(db: DynamoDBClient, RekogClient: RekognitionClient) =>
	async (
		ourBucket: string,
		ourKey: string,
		tableName: string,
		hashTable: string,
		eTag: string,
	): Promise<{ success: boolean } | { error: Error }> => {
		//Clean the string to add the colon back into requested name
		const safeKey = replaceSubstringWithColon(ourKey)
		console.log('Currently processing the following image')
		console.log('Bucket: ' + ourBucket + ' key name: ' + safeKey)
		const response = await RekogClient.send(
			new DetectLabelsCommand({
				Image: {
					S3Object: {
						Bucket: ourBucket,
						Name: safeKey,
					},
				},
				MaxLabels: 10,
				MinConfidence: minConfidence,
			}),
		)
		if (response === undefined) {
			return { error: new Error('Failed to retrieve labels.') }
		}

		//Create our array and dict for our label construction
		const objectsDetected: string[] = []
		const imageLabels: Record<string, Record<string, string>> = {}

		//Add all of our labels into imageLabels by iterating over response['Labels']
		response.Labels?.forEach((label) => {
			objectsDetected.push(label.Name ?? '')
			const indexString = 'Object' + String(objectsDetected.length)
			imageLabels[indexString] = { S: label.Name ?? '' }
		})

		//Put the labels into the table
		const uploadLabels = await db.send(
			new PutItemCommand({
				TableName: tableName,
				Item: {
					...imageLabels,
					image: { S: safeKey },
				},
			}),
		)
		if (uploadLabels === undefined) {
			return {
				error: new Error(`Failed to upload labels to table: ${tableName}`),
			}
		}
		//Put the labels into the hashTable
		const uploadLabelsHash = await db.send(
			new PutItemCommand({
				TableName: hashTable,
				Item: {
					...imageLabels,
					hashTable: { S: eTag },
				},
			}),
		)

		if (uploadLabelsHash === undefined) {
			return {
				error: new Error(`Failed to upload labels to table: ${hashTable}`),
			}
		}
		return { success: true }
	}
