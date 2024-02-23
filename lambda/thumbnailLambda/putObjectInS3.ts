import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3'

export const putObjectInS3 =
	(s3: S3Client, Bucket: string) =>
	async (
		resizedImage: Buffer,
		thumbKey: string,
	): Promise<{ success: boolean } | { error: Error }> => {
		try {
			await s3.send(
				new PutObjectCommand({
					Body: resizedImage,
					Bucket,
					Key: thumbKey,
				}),
			)
			return { success: true }
		} catch (err) {
			return { error: new Error('Error when uploading resized image') }
		}
	}
