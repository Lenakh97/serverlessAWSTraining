// user puts image in s3 bucket - workflow?
// SQS sends event to handler, which is executed
// Bucket name and key will be found in the event
// generateThumb is then executed and will:
//  - download image from s3 bucket (found in event)
//  - resize image (make thumbnail)
//  - upload thumbnail to new S3 bucket
// rekognitionFunction() is executed
//  - use RekogClient to retrieve labels
//  - put labels info record
//  - put the labels into a dynamoDB
import { after, describe, test } from "node:test";

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "path";
import { readFile } from "fs/promises";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const RekogClient = new RekognitionClient({ region: "us-east-2" });
const db = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(db);
const s3 = new S3Client({});

const { ThumbBucket, TableName, BucketName } = fromEnv({
  ThumbBucket: "THUMBBUCKET",
  TableName: "TABLENAME",
  BucketName: "BUCKETNAME",
})(process.env);

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = `cats.jpeg`;

describe("e2e-tests", () => {
  after(async () => {
    console.log("finished with tests");
    //delete resources after running tests

    /*await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    console.log("deleted image in s3 bucket");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: ThumbBucket,
        Key: key,
      })
    );
    console.log("deleted image in thumbBucket");
    */
  });
  test("uploading an image to the bucket should trigger the handler", async () => {
    //uploading an image to the bucket should trigger the handler
    const uploadImage = await readFile(image);

    await s3.send(
      new PutObjectCommand({
        Bucket: BucketName,
        Key: key,
        Body: uploadImage,
      })
    );
  });
  test("a thumbnail should be generated and put in thumbBucket", async () => {
    const thumbNailImage = await s3.send(
      new GetObjectCommand({
        Bucket: ThumbBucket,
        Key: key,
      })
    );
    console.log(thumbNailImage);

    // rekognition should be used to get labels from the image
  });
  test("labels should be put in dynamodb", async () => {
    const response = await docClient.send(
      new ScanCommand({
        TableName: TableName,
      })
    );
    if (response.Count === 0) {
      console.log("No items in dynamoDB");
    }
    console.log(response.Items);
  });
});
