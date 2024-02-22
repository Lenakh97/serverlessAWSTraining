import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { describe, it, mock } from 'node:test'
import { check, objectMatching } from 'tsmatchers'
import { storeLabelsInCacheDynamoDB } from './storeLabelsInCacheDynamoDB.js'

void describe('storeLabelsInCacheDynamoDB()', () => {
	void it('should send PutItemCommand with correct parameters', async () => {
		const dynamoSend = mock.fn(async () => Promise.resolve())
		const eTag = 'eTag123'
		const tableName = 'table'
		const labels = { Object1: { S: 'cat' }, Object2: { S: 'mammal' } }
		const db: DynamoDBClient = {
			send: dynamoSend,
		} as any
		await storeLabelsInCacheDynamoDB(db, tableName)(labels, eTag)
		check((dynamoSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					TableName: tableName,
					Item: {
						...labels,
						hashTable: { S: eTag },
					},
				},
			}),
		)
	})
})
