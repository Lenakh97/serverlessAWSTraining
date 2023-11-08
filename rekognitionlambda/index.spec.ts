import { describe, test, before } from "node:test";
import assert from "node:assert";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { readFile } from "fs/promises";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import pRetry from "p-retry";
import { stackOutput } from "@nordicsemiconductor/cloudformation-helpers";
import type { StackOutputs } from "../lib/aws_dev_hour-stack";
import { randomUUID } from "node:crypto";
import axios from "axios";

const s3 = new S3Client({});
const CFclient = new CloudFormationClient();

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = randomUUID() + ".jpeg";

let bucketName: string;
let imageApi: string;

describe("e2e-tests", () => {
  before(async () => {
    //Get resource names from cloudformation
    const outputs =
      await stackOutput(CFclient)<StackOutputs>("AwsDevHourStack");
    bucketName = outputs.imageBucket;
    imageApi = outputs.imageApi;
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

    //Try to get the labels from the API
    const resFromApi = await pRetry(() => getLabelsFromApi("getLabels", key), {
      onFailedAttempt: (error) => {
        console.log("failed: ", error);
      },
      retries: 5,
    });
    if (resFromApi[0] === undefined) {
      assert.fail("Labels not found.");
    }
    assert.equal(resFromApi[0].Object1?.S, "Animal");
    assert.equal(resFromApi[0].Object2?.S, "Cat");
    assert.equal(resFromApi[0].Object3?.S, "Mammal");
  });
});

const getLabelsFromApi = async (method: string, key: string) => {
  const url = `${imageApi}/images?action=${method}&key=${key}`;
  const res = await axios.get(url);
  if (Object.keys(res.data).length === 0) {
    throw new Error("No labels found");
  }
  return res.data;
};
