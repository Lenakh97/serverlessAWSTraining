import { describe, test, before } from "node:test";
import assert from "node:assert";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { readFile } from "fs/promises";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import pRetry from "p-retry";
import { stackOutput } from "@nordicsemiconductor/cloudformation-helpers";
import type { StackOutputs } from "../lib/aws_dev_hour-stack";
import { randomUUID } from "node:crypto";

const db = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(db);
const s3 = new S3Client({});
const CFclient = new CloudFormationClient();

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = randomUUID() + ".jpeg";

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
  });
  test("uploading an image to the bucket should trigger the handler and upload labels to DynamoDB", async () => {
    const uploadImage = await readFile(image);
    //Putting the image in the s3 bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: uploadImage,
      })
    );

    //Check if the labels are in DynamoBD, if not try again up to 5 times.
    const res = await pRetry(() => getTableItems(tableName), {
      onFailedAttempt: (error) => {
        console.log("failed: ", error);
      },
      retries: 5,
    });

    if (res.Items === undefined) {
      assert.fail("Item in DynamoDB is undefined");
    }
    //Check that the item has the correct labels
    assert.equal(res.Items[0].Object1.S, "Animal");
    assert.equal(res.Items[0].Object2.S, "Cat");
    assert.equal(res.Items[0].Object3.S, "Mammal");
  });
});

const getTableItems = async (tableName: string) => {
  const res = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "image = :key",
      ExpressionAttributeValues: {
        ":key": { S: key },
      },
    })
  );
  if (res.Count === 0) {
    throw new Error("No items in table");
  }
  return res;
};
