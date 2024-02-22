import {
	DetectLabelsCommand,
	type Label,
	type RekognitionClient,
} from '@aws-sdk/client-rekognition'
import { replaceSubstringWithColon } from '../../util/replaceSubstringWithColon.js'

export const recognizeImage =
	(RekogClient: RekognitionClient, bucketName: string, minConfidence: number) =>
	async (imageKey: string): Promise<Label[] | undefined> => {
		const response = await RekogClient.send(
			new DetectLabelsCommand({
				Image: {
					S3Object: {
						Bucket: bucketName,
						Name: replaceSubstringWithColon(imageKey),
					},
				},
				MaxLabels: 10,
				MinConfidence: minConfidence,
			}),
		)
		return response.Labels
	}
