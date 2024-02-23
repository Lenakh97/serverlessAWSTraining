import { Readable } from 'stream'

export const streamToBuffer = async (stream: Readable): Promise<Buffer> =>
	new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = []
		stream.on('data', (chunk) => chunks.push(chunk))
		stream.once('end', () => resolve(Buffer.concat(chunks)))
		stream.once('error', reject)
	})
