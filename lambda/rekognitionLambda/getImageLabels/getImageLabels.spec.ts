import { describe, it } from 'node:test'
import { getImageLabels } from './getImageLabels.js'
import assert from 'node:assert/strict'

void describe('getImageLabels()', () => {
	void it('should get image labels from cache if getLabelsByEtag returns labels', async () => {
		const eTag = 'eTag123'
		const imageKey = 'imageKey'
		const getLabels = getImageLabels({
			getLabelsByEtag: async () =>
				Promise.resolve({
					Object1: { S: 'cat' },
					Object2: { S: 'mammal' },
					hashTable: { S: 'ert123' },
				}),
			recognizeImage: async () =>
				Promise.resolve([{ Name: 'rekogCat' }, { Name: 'rekogMammal' }]),
			storeLabelsInCacheDynamoDB: async () =>
				Promise.resolve({ success: true }),
		})
		assert.deepEqual(await getLabels(eTag, imageKey), {
			Object1: { S: 'cat' },
			Object2: { S: 'mammal' },
			isCached: { BOOL: true },
		})
	})
	void it('should get image labels from rekognition if getLabelsByEtag returns undefined', async () => {
		const eTag = 'eTag123'
		const imageKey = 'imageKey'
		const getLabels = getImageLabels({
			getLabelsByEtag: async () => Promise.resolve(undefined),
			recognizeImage: async () =>
				Promise.resolve([{ Name: 'rekogCat' }, { Name: 'rekogMammal' }]),
			storeLabelsInCacheDynamoDB: async () =>
				Promise.resolve({ success: true }),
		})
		assert.deepEqual(await getLabels(eTag, imageKey), {
			Object1: { S: 'rekogCat' },
			Object2: { S: 'rekogMammal' },
			isCached: { BOOL: false },
		})
	})
	void it('should return undefined if no labels are found', async () => {
		const eTag = 'eTag123'
		const imageKey = 'imageKey'
		const getLabels = getImageLabels({
			getLabelsByEtag: async () => Promise.resolve(undefined),
			recognizeImage: async () => Promise.resolve(undefined),
			storeLabelsInCacheDynamoDB: async () =>
				Promise.resolve({ success: true }),
		})
		assert.deepEqual(await getLabels(eTag, imageKey), undefined)
	})
})
