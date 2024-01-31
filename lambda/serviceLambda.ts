import { AttributeValue, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { fromEnv } from '@nordicsemiconductor/from-env'
import { getLabels } from './serviceLambda/getLabels.js'
import { deleteImageFromDynamoDB } from './serviceLambda/deleteImageFromDynamoDB.js'
import { deleteImageFromBucket } from './serviceLambda/deleteImageFromBucket.js'

const db = new DynamoDBClient({})
const s3 = new S3Client({})
const docClient = DynamoDBDocumentClient.from(db)

const { Table, Bucket } = fromEnv({
	Table: 'TABLE',
	Bucket: 'BUCKET',
})(process.env)

type handlerEvent = {
	action: string
	key: string
}

const deleteImageFile = deleteImageFromBucket(s3)

const deleteImageDBData = async (key: string) =>
	deleteImageFromDynamoDB(key, Table, docClient)

export const handler = async (
	event: handlerEvent,
): Promise<
	| Error
	| Record<string, AttributeValue>[]
	| {
			error: Error
			success?: undefined
	  }
	| {
			success: boolean
			error?: undefined
	  }
	| undefined
> => {
	const action = event.action
	const image = event.key
	console.log('handler initiated')
	switch (action) {
		case 'getLabels': {
			const maybeLabels = await getLabels(image, Table, docClient)
			if ('error' in maybeLabels) {
				console.error('Error getLabels(): ', maybeLabels.error)
				return maybeLabels.error
			}
			return maybeLabels.success.Items
		}
		case 'deleteImage': {
			const results = await Promise.all([
				deleteImageDBData(image),
				deleteImageFile(Bucket, image),
			])

			for (const promise of results) {
				if ('error' in promise) {
					console.error('Error deleteImage(): ', promise.error)
					return { error: promise.error }
				}
			}
			return { success: true }
		}
	}
	return new Error(
		"No action given. Give either 'getLabels' or 'deleteImage' as action.",
	)
}
