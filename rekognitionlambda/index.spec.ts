import { describe, test, before } from "node:test";
import assert from "node:assert";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "path";
import { readFile } from "fs/promises";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import pRetry from "p-retry";
import { stackOutput } from "@nordicsemiconductor/cloudformation-helpers";
import type { StackOutputs } from "../lib/aws_dev_hour-stack";

const db = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(db);
const s3 = new S3Client({});
const CFclient = new CloudFormationClient();

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = `cats.jpeg`;

let thumbBucketName: string;
let tableName: string;
let bucketName: string;

describe("e2e-tests", () => {
  before(async () => {
    //Get resource names from cloudformation
    const outputs = await stackOutput(CFclient)<StackOutputs>(
      "AwsDevHourStack"
    );
    bucketName = outputs.imageBucket;
    thumbBucketName = outputs.resizedBucket;
    tableName = outputs.ddbTable;
    //delete images in both s3 buckets before running test
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
    console.log("deleted image in original bucket");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: thumbBucketName,
        Key: key,
      })
    );
    console.log("deleted image in thumbBucket");
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { image: key },
      })
    );
    console.log("deleted labels in dynamoDB");
  });
  test("uploading an image to the bucket should trigger the handler", async () => {
    //uploading an image to the bucket should trigger the handler
    const uploadImage = await readFile(image);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: uploadImage,
      })
    );
  });
  const getTableItems = async (tableName: string) => {
    const res = await docClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );
    if (res.Count === 0) {
      throw new Error("No items in table");
    }
    return res;
  };

  test("labels should be put in dynamodb", async () => {
    //Check if the labels are in DynamoBD, if not try again up to 5 times.
    const res = await pRetry(() => getTableItems(tableName), {
      onFailedAttempt: (error) => {
        console.log("failed: ", error);
      },
      retries: 5,
    });
    //Check that there exists an item in DynamoDB
    assert.equal(res.Count, 1);
    //Check that the item has the correct key
    if (res.Items !== undefined) {
      assert.equal(res.Items[0].image, key);
    }
  });
});
