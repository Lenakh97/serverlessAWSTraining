// TODO: index.js/index.ts is usually a barrel file, use a better name. Since its an e2e test, move it into a separate e2e folder
// Goes also for all the test related code.
import { describe, test } from "node:test";
import assert from "node:assert";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";
import { readFile } from "fs/promises";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import pRetry from "p-retry";
import { stackOutput } from "@nordicsemiconductor/cloudformation-helpers";
import type { StackOutputs } from "../cdk/stacks/aws_dev_hour-stack";
import { randomUUID } from "node:crypto";
import { getAccessToken } from "./getAccessToken";
import { getLabelsFromApi } from "./getLabelsFromApi";

const s3 = new S3Client({});
const CFclient = new CloudFormationClient();

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = "private/" + randomUUID() + ".jpeg";

const outputs = await stackOutput(CFclient)<StackOutputs>("AwsDevHourStack");
describe("e2e-tests", async () => {
  test("uploading an image to the bucket should trigger the handler and upload labels to DynamoDB", async () => {
    const uploadImage = await readFile(image);
    //Putting the image in the s3 bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: outputs.imageBucket,
        Key: key,
        Body: uploadImage,
      })
    );

    //Get labels from API by making a user and getting an authorization token

    const accessToken = await getAccessToken({
      userPoolId: outputs.UserPoolId,
      userPoolClientId: outputs.AppClientId,
    });

    //Try to get the labels from the API
    const resFromApi = await pRetry(
      () => getLabelsFromApi("getLabels", key, accessToken, outputs.imageApi),
      {
        onFailedAttempt: (error) => {
          console.log("failed: ", error);
        },
        retries: 5,
      }
    );
    if (resFromApi[0] === undefined) {
      assert.fail("Labels not found.");
    }
    assert.equal(resFromApi[0].Object1?.S, "Animal");
    assert.equal(resFromApi[0].Object2?.S, "Cat");
    assert.equal(resFromApi[0].Object3?.S, "Mammal");
  });
});
