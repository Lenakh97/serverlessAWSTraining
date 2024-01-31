import { describe, test } from 'node:test'
import assert from 'node:assert'
import { replaceSubstringWithColon } from './replaceSubstringWithColon.js'

void describe('replaceSubstringWithColon()', () => {
	void test('should replace substring "%3A" with colon', () => {
		assert.equal(replaceSubstringWithColon('sub%3Astring'), 'sub:string')
	})
})
