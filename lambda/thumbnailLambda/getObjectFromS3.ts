import {
	GetObjectCommand,
	type GetObjectCommandOutput,
	type S3Client,
} from '@aws-sdk/client-s3'

export const getObjectFromS3 =
	(s3: S3Client, bucketName: string) =>
	async (bucketKey: string): Promise<GetObjectCommandOutput | null> => {
		try {
			const image = await s3.send(
				new GetObjectCommand({
					Bucket: bucketName,
					Key: bucketKey,
				}),
			)
			return image
		} catch {
			return null
		}
	}
