import { QueryCommand } from '@aws-sdk/client-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { dynamoDbLabels } from './getImageLabels.js'

export const getLabelsByEtag =
	(docClient: DynamoDBDocumentClient, HashTable: string) =>
	async (eTag: string): Promise<dynamoDbLabels | undefined> => {
		const maybeLabels = await docClient.send(
			new QueryCommand({
				TableName: HashTable,
				KeyConditionExpression: 'hashTable = :key',
				ExpressionAttributeValues: {
					':key': { S: eTag },
				},
			}),
		)
		if (maybeLabels === undefined || maybeLabels.Count === 0) {
			return undefined
		}
		return maybeLabels.Items?.[0] as unknown as dynamoDbLabels
	}
