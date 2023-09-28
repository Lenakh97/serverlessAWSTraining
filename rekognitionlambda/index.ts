import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { S3Client } from "@aws-sdk/client-s3";

import { rekognitionFunction } from "./rekognitionFunction.js";
import { generateThumb } from "./generateThumb.js";
import { S3Event, SQSEvent } from "aws-lambda";

export const RekogClient = new RekognitionClient({ region: "us-east-2" });
export const db = new DynamoDBClient({});
export const s3 = new S3Client({});

const { Table, ThumbBucket } = fromEnv({
  Table: "TABLE",
  ThumbBucket: "THUMBBUCKET",
})(process.env);

export const handler = async (event: SQSEvent) => {
  console.log("Lambda processing event: ");
  const records = event.Records;
  for await (const payload of records) {
    const eventInfo = JSON.parse(payload.body) as S3Event;
    for await (const element of eventInfo?.Records ?? []) {
      const bucketName = element.s3.bucket.name;
      const bucketKey = element.s3.object.key;
      await generateThumb(bucketName, bucketKey, ThumbBucket, s3);
      await rekognitionFunction(bucketName, bucketKey, Table, db);
    }
  }
};
