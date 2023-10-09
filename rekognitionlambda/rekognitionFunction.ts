import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { replaceSubstringWithColon } from "./replaceSubstringWithColon";
import { RekogClient } from ".";

// min confidence for amazon rekognition
export const minConfidence = 50;

export const rekognitionFunction = async (
  ourBucket: string,
  ourKey: string,
  tableName: string,
  db: DynamoDBClient
): Promise<{ success: boolean } | { error: Error }> => {
  //Clean the string to add the colon back into requested name
  const safeKey = replaceSubstringWithColon(ourKey);
  console.log("Currently processing the following image");
  console.log("Bucket: " + ourBucket + " key name: " + safeKey);

  //Try to retrieve labels from Amazon Rekognition, using the confidence level set above
  const response = await RekogClient.send(
    new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: ourBucket,
          Name: safeKey,
        },
      },
      MaxLabels: 10,
      MinConfidence: minConfidence,
    })
  );
  if (response === undefined) {
    return { error: new Error("Failed to retrieve labels.") };
  }

  //Create our array and dict for our label construction
  const objectsDetected = [];
  const imageLabels: Record<string, Record<string, string>> = {};

  //Add all of our labels into imageLabels by iterating over response['Labels']
  response.Labels?.forEach((label) => {
    objectsDetected.push(label.Name);
    const indexString = "Object" + String(objectsDetected.length);
    imageLabels[indexString] = { S: label.Name ?? "" };
  });

  //Put them into table
  const uploadLabels = await db.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        ...imageLabels,
        image: { S: safeKey },
      },
    })
  );
  if (uploadLabels === undefined) {
    return {
      error: new Error(`Failed to upload labels to table: ${tableName}`),
    };
  }
  return { success: true };
};
