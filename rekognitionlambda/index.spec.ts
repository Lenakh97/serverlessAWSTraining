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
import {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const s3 = new S3Client({});
const CFclient = new CloudFormationClient();

const image = path.join(process.cwd(), "./rekognitionlambda/cats.jpeg");
const key = randomUUID() + ".jpeg";

let bucketName: string;
let imageApi: string;
let userPoolId: string;
let userPoolClientId: string;

const randSeq = () =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "");

describe("e2e-tests", async () => {
  before(async () => {
    //Get resource names from cloudformation
    const outputs =
      await stackOutput(CFclient)<StackOutputs>("AwsDevHourStack");
    bucketName = outputs.imageBucket;
    imageApi = outputs.imageApi;
    userPoolId = outputs.UserPoolId;
    userPoolClientId = outputs.AppClientId;
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

    //Get labels from API by making a user and getting an authorization token

    const username = randSeq();
    const email = `${username}@example.com`;
    const TemporaryPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`;
    const newPassword = `${randSeq()}${randSeq().toUpperCase()}${Math.random()}`;

    var cognitoidentityserviceprovider = new CognitoIdentityProviderClient();

    // creating a user for testing the api
    await cognitoidentityserviceprovider.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "True" },
        ],
        TemporaryPassword,
      })
    );
    /*
      The session that should be passed both ways in challenge-response calls to the service. 
      If AdminInitiateAuth or AdminRespondToAuthChallenge API call determines that the caller must
      pass another challenge, they return a session with another challenge parameter. 
      This session should be passed as it is to the next AdminRespondToAuthChallenge API call 
    */

    const { Session } = await cognitoidentityserviceprovider.send(
      new AdminInitiateAuthCommand({
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: TemporaryPassword,
        },
      })
    );

    await cognitoidentityserviceprovider.send(
      new AdminRespondToAuthChallengeCommand({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
        Session: Session ?? "",
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: newPassword,
        },
      })
    );
    /*
      The result of the authentication response. This is only returned if the caller doesn't 
      need to pass another challenge. If the caller does need to pass another challenge before 
      it gets tokens, ChallengeName, ChallengeParameters, and Session are returned.
    */
    const { AuthenticationResult } = await cognitoidentityserviceprovider.send(
      new AdminInitiateAuthCommand({
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        UserPoolId: userPoolId,
        ClientId: userPoolClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: newPassword,
        },
      })
    );

    const getLabelsFromApi = async (method: string, key: string) => {
      const url = `${imageApi}/images?action=${method}&key=${key}`;
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${AuthenticationResult?.IdToken}`,
        },
      });
      if (Object.keys(res.data).length === 0) {
        throw new Error("No labels found");
      }
      return res.data;
    };

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
