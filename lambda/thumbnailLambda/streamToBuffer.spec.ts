import { Readable } from 'stream'
import { describe, it } from 'node:test'
import { streamToBuffer } from './streamToBuffer.js'
import assert from 'node:assert/strict'

void describe('streamToBuffer((', () => {
	void it('should transform a stream into buffer', async () => {
		const readable = new Readable()
		readable.push('bucket')
		readable.push(null)

		const buffer = await streamToBuffer(readable)
		assert.equal(buffer.toString(), 'bucket')
	})
})
