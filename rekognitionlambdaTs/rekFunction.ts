import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { replaceSubstringWithColon } from "./replaceSubstringWithColon";
import { RekogClient, minConfidence, db } from ".";

export const rekFunction = async (ourBucket: string, ourKey: string) => {
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
      TableName: Table,
      Item: marshall({
        timestamp: new Date().toISOString(),
        imageLabels,
      }),
    })
  );
};
