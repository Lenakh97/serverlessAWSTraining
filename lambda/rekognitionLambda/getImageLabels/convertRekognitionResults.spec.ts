import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { convertRekognitionResults } from './convertRekognitionResults.js'

void describe('convertRekognitionResults', () => {
	void it('should convert results from Rekognition to dynamoDB Item type', () => {
		const rekogResult = [{ Name: 'cat' }, { Name: 'mammal' }]
		const expectedResults = { Object1: { S: 'cat' }, Object2: { S: 'mammal' } }
		assert.deepEqual(convertRekognitionResults(rekogResult), expectedResults)
	})
})
