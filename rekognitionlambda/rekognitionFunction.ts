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
) => {
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

  //Create our array and dict for our label construction
  const objectsDetected = [];
  const imageLabels: Record<string, string> = {
    image: safeKey,
  };

  //Add all of our labels into imageLabels by iterating over response['Labels']
  response.Labels?.forEach((label) => {
    objectsDetected.push(label.Name);
    const indexString = "Object" + String(objectsDetected.length);
    imageLabels[indexString] = label.Name ?? "";
  });

  //Put them into table
  await db.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        ...imageLabels,
        image: { S: safeKey },
      },
    })
  );
};
