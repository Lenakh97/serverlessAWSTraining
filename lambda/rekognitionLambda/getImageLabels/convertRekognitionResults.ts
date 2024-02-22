import type { Label } from '@aws-sdk/client-rekognition'
import type { dynamoDbLabels } from './getImageLabels.js'

export const convertRekognitionResults = (
	rekognitionResults: Label[],
): dynamoDbLabels => {
	//Create our array and dict for our label construction
	const objectsDetected: string[] = []
	const imageLabels: dynamoDbLabels = {}

	//Add all of our labels into imageLabels by iterating over response['Labels']
	rekognitionResults.forEach((label) => {
		objectsDetected.push(label.Name ?? '')
		const indexString = 'Object' + String(objectsDetected.length)
		imageLabels[indexString] = { S: label.Name ?? '' }
	})
	return imageLabels
}
