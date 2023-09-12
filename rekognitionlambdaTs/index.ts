import {
  RekognitionClient,
  DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
var fs = require("fs");

const RekogClient = new RekognitionClient({ region: "REGION" });
const db = new DynamoDBClient({});
const s3 = new S3Client({});

const { Table, Bucket, ThumbBucket } = fromEnv({
  Table: "TABLE",
  Bucket: "BUCKET",
  ThumbBucket: "THUMBBUCKET",
})(process.env);

// min confidence for amazon rekognition
const minConfidence = 50;

export const handler = (ourBucket: string, ourKey: string) => {
  console.log("Lambda processing event: ");
  //For each message (photo) get the bucket name and key
  //For each bucket/key, retrieve labels
  generateThumb(ourBucket, ourKey);
  rekFunction(ourBucket, ourKey);
};

export const generateThumb = async (ourBucket: string, ourKey: string) => {
  // Clean the string to add the colon back into requested name
  const safeKey = replaceSubstringWithColon(ourKey);
  // Define upload and download paths
  // Download file from s3 and store it in Lambda /tmp storage
  const image = s3.send(
    new GetObjectCommand({
      Bucket: Bucket,
      Key: safeKey,
    })
  );
  fs.writeFile("tmp/img.jpg");

  // Create thumbnail using Pillow library
  const thumbNail = "";
  //Upload the thumbnail to the thumbnail bucket
  await s3.send(
    new PutObjectCommand({
      Body: thumbNail,
      Bucket: ThumbBucket,
      Key: safeKey,
    })
  );
  //Clean up files in /tmp so we don't run out of space
};

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

  //Instantiate a table resource object of our environment variable

  //Put them into table
  await db.send(
    new PutItemCommand({
      TableName: Table,
      Item: marshall({
        //cacheKey: "strava-summary",
        timestamp: new Date().toISOString(),
        //ttl: Date.now() / 1000 + 24 * 60 * 60, // 24 hours
        imageLabels,
      }),
    })
  );
};

export const replaceSubstringWithColon = (txt: string): string =>
  txt.replace("%3A", ":");
