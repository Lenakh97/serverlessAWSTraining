import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { describe, it, mock } from 'node:test'
import { check, objectMatching } from 'tsmatchers'
import { storeLabelsInDynamoDB } from './storeLabelsInDynamoDB.js'

void describe('storeLabelsInDynamoDB()', () => {
	void it('should send PutItemCommand with correct parameters', async () => {
		const dynamoSend = mock.fn(async () => Promise.resolve())
		const key = 'key'
		const tableName = 'table'
		const labels = { Object1: { S: 'cat' }, Object2: { S: 'mammal' } }
		const db: DynamoDBClient = {
			send: dynamoSend,
		} as any
		await storeLabelsInDynamoDB(db, tableName)(labels, key)
		check((dynamoSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					TableName: tableName,
					Item: {
						...labels,
						image: { S: key },
					},
				},
			}),
		)
	})
})
