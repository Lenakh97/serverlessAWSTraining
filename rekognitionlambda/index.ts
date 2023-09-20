import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { S3Client } from "@aws-sdk/client-s3";
import sharpType from "sharp";
import * as sharpModule from "/opt/nodejs/node_modules/sharp"; // Uses the location of the module IN the layer
import { rekFunction } from "./rekFunction";
import { generateThumb } from "./generateThumb";

export const sharp = sharpModule.default as typeof sharpType;

export const RekogClient = new RekognitionClient({ region: "REGION" });
export const db = new DynamoDBClient({});
export const s3 = new S3Client({});

const { Table, Bucket, ThumbBucket } = fromEnv({
  Table: "TABLE",
  Bucket: "BUCKET",
  ThumbBucket: "THUMBBUCKET",
})(process.env);

// min confidence for amazon rekognition
export const minConfidence = 50;

export const handler = (ourBucket: string, ourKey: string) => {
  console.log("Lambda processing event: ");
  //For each message (photo) get the bucket name and key
  //For each bucket/key, retrieve labels
  generateThumb(ourBucket, ourKey, ThumbBucket);
  rekFunction(ourBucket, ourKey, Table);
};
