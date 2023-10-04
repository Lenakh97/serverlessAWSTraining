import { describe, test, before } from "node:test";
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
import {
  CloudFormationClient,
  ListStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

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
    //Get resource names from cloudformation (bucketName and tableName)
    const response = await CFclient.send(
      new ListStackResourcesCommand({ StackName: "AwsDevHourStack" })
    );
    for (const {
      ResourceType,
      PhysicalResourceId,
    } of response.StackResourceSummaries ?? []) {
      if (ResourceType === "AWS::S3::Bucket") {
        if (PhysicalResourceId?.includes("resized")) {
          thumbBucketName = PhysicalResourceId;
        } else {
          bucketName = PhysicalResourceId ?? "";
        }
      }
      if (ResourceType === "AWS::DynamoDB::Table") {
        tableName = PhysicalResourceId ?? "";
      }
    }
    console.log(bucketName, thumbBucketName, tableName);

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
  test("labels should be put in dynamodb", async () => {
    const response = await docClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );
    if (response.Count === 0) {
      console.log("No items in dynamoDB");
    }
    console.log(response.Items);
  });
});
