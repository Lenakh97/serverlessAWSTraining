import { describe, it, mock } from 'node:test'
import { check, objectMatching } from 'tsmatchers'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { deleteImageFromDynamoDB } from './deleteImageFromDynamoDB.js'

void describe('deleteImageFromDynamoDB()', () => {
	const key = 'key'
	const tableName = 'tableName'
	void it('should use AWS DynamoDBClient to delete image from dynamoDB', async () => {
		const dynamoSend = mock.fn()
		const db: DynamoDBDocumentClient = {
			send: dynamoSend,
		} as any
		await deleteImageFromDynamoDB(key, tableName, db)

		//Check that the correct command is used?

		//check that the function is called with the correct arguments
		check((dynamoSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					TableName: tableName,
					Key: { image: key },
				},
			}),
		)
	})
})
