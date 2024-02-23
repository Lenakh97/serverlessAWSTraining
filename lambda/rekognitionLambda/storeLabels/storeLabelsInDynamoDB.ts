import { PutItemCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { replaceSubstringWithColon } from '../../util/replaceSubstringWithColon.js'
import type { dynamoDbLabels } from '../getImageLabels/getImageLabels.js'

export const storeLabelsInDynamoDB =
	(db: DynamoDBClient, tableName: string) =>
	async (
		labels: dynamoDbLabels,
		key: string,
	): Promise<{ success: boolean } | { error: Error }> => {
		const dbSend = await db.send(
			new PutItemCommand({
				TableName: tableName,
				Item: {
					...labels,
					image: { S: replaceSubstringWithColon(key) },
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
