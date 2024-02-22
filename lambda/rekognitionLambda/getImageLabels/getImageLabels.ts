import type { Label } from '@aws-sdk/client-rekognition'
import { convertRekognitionResults } from './convertRekognitionResults.js'
export type dynamoDbLabels = Record<string, Record<string, string | boolean>>

export const getImageLabels =
	({
		getLabelsByEtag,
		recognizeImage,
		storeLabelsInCacheDynamoDB,
	}: {
		getLabelsByEtag: (eTag: string) => Promise<dynamoDbLabels | undefined>
		recognizeImage: (imageKey: string) => Promise<Label[] | undefined>
		storeLabelsInCacheDynamoDB: (
			labels: dynamoDbLabels,
			eTag: string,
		) => Promise<{ success: boolean } | { error: Error }>
	}) =>
	async (
		eTag: string,
		imageKey: string,
	): Promise<dynamoDbLabels | undefined> => {
		const eTagLabels = await getLabelsByEtag(eTag)
		if (eTagLabels === undefined) {
			const rekogLabels = await recognizeImage(imageKey)
			if (rekogLabels === undefined) {
				return undefined
			}
			const convertedLabels = convertRekognitionResults(rekogLabels)
			await storeLabelsInCacheDynamoDB(convertedLabels, eTag)
			convertedLabels['isCached'] = { BOOL: false }
			return convertedLabels
		}
		eTagLabels['isCached'] = { BOOL: true }
		const returnLabels = { ...eTagLabels }
		delete returnLabels['hashTable']
		return returnLabels
	}
