import { QueryCommand, type QueryCommandOutput } from '@aws-sdk/client-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export const getLabels = async (
	image: string,
	Table: string,
	docClient: DynamoDBDocumentClient,
): Promise<{ success: QueryCommandOutput } | { error: Error }> => {
	const res = await docClient.send(
		new QueryCommand({
			TableName: Table,
			KeyConditionExpression: 'image = :key',
			ExpressionAttributeValues: {
				':key': { S: image },
			},
		}),
	)
	if (res === undefined || res.Count === 0) {
		return { error: new Error('Labels not found.') }
	}
	console.log('Labels have been found in DynamoDB.')
	return { success: res }
}
