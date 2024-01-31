import { describe, it, mock } from 'node:test'
import { getLabels } from './getLabels.js'
import { check, objectMatching } from 'tsmatchers'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

void describe('getLabels()', () => {
	const key = 'key'
	const tableName = 'tableName'
	void it('should use AWS DynamoDBClient to request detected labels', async () => {
		const dynamoSend = mock.fn()
		const db: DynamoDBDocumentClient = {
			send: dynamoSend,
		} as any
		await getLabels(key, tableName, db)

		//Check that the correct command is used?

		//check that the function is called with the correct arguments
		check((dynamoSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					TableName: tableName,
					KeyConditionExpression: 'image = :key',
					ExpressionAttributeValues: {
						':key': { S: key },
					},
				},
			}),
		)
	})
})
