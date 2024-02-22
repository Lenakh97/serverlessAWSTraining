import { PutItemCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { dynamoDbLabels } from '../getImageLabels/getImageLabels.js'

export const storeLabelsInCacheDynamoDB =
	(db: DynamoDBClient, tableName: string) =>
	async (
		labels: dynamoDbLabels,
		eTag: string,
	): Promise<{ success: boolean } | { error: Error }> => {
		const dbSend = await db.send(
			new PutItemCommand({
				TableName: tableName,
				Item: {
					...labels,
					hashTable: { S: eTag },
				},
			}),
		)
		if (dbSend === undefined) {
			return {
				error: new Error(`Failed to upload labels to table: ${tableName}`),
			}
		}
		return { success: true }
	}
