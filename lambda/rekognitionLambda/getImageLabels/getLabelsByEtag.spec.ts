import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { check, objectMatching } from 'tsmatchers'
import { getLabelsByEtag } from './getLabelsByEtag.js'
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

void describe('getLabelsByEtag()', () => {
	void it('should get labels by using etag', async () => {
		const HashTable = 'hashTable'
		const eTag = 'etag123'
		const dynamoDocSend = mock.fn(async () =>
			Promise.resolve({
				Items: [
					{
						Object1: { S: 'cat' },
						Object2: { S: 'mammal' },
						image: { S: 'image.png' },
					},
				],
			}),
		)
		const docClient: DynamoDBDocumentClient = {
			send: dynamoDocSend,
		} as any
		await getLabelsByEtag(docClient, HashTable)(eTag)
		check((dynamoDocSend.mock.calls[0]?.arguments as unknown[])[0]).is(
			objectMatching({
				input: {
					TableName: HashTable,
					KeyConditionExpression: 'hashTable = :key',
					ExpressionAttributeValues: {
						':key': { S: eTag },
					},
				},
			}),
		)
	})
	void it('should return labels in the correct format', async () => {
		const HashTable = 'hashTable'
		const eTag = 'etag123'
		const dynamoDocSend = mock.fn(async () =>
			Promise.resolve({
				Items: [
					{
						Object1: { S: 'cat' },
						Object2: { S: 'mammal' },
						image: { S: 'image.png' },
					},
				],
			}),
		)
		const docClient: DynamoDBDocumentClient = {
			send: dynamoDocSend,
		} as any
		const expectedResult = {
			Object1: { S: 'cat' },
			Object2: { S: 'mammal' },
			image: { S: 'image.png' },
		}
		assert.deepEqual(
			await getLabelsByEtag(docClient, HashTable)(eTag),
			expectedResult,
		)
	})
})
