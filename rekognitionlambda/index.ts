// TODO: index.js/index.ts is usually a barrel file, use a better name, like lambda. Put all the lambda entries in one folder.
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { S3Client } from "@aws-sdk/client-s3";

import { rekognitionFunction } from "./rekognitionFunction.js";
import { generateThumb } from "./generateThumb.js";
import type { S3Event, S3EventRecord, SQSEvent, SQSRecord } from "aws-lambda";

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
  await Promise.all(
    records.map(async (payload: SQSRecord) => {
      const eventInfo = JSON.parse(payload.body) as S3Event;
      await Promise.all(
        eventInfo?.Records?.map(async (element: S3EventRecord) => {
          const bucketName = element.s3.bucket.name;
          const bucketKey = element.s3.object.key;
          const maybeThumbnail = await generateThumb(
            bucketName,
            bucketKey,
            ThumbBucket,
            s3
          );
          if ("error" in maybeThumbnail) {
            console.error("Error generateThumb():", maybeThumbnail.error);
          }
          const maybeRekognition = await rekognitionFunction(
            bucketName,
            bucketKey,
            Table,
            db
          );
          if ("error" in maybeRekognition) {
            console.error(
              "Error rekognitionFunction(): ",
              maybeRekognition.error
            );
          }
        }) ?? []
      );
    })
  );
};
