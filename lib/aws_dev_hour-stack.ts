import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import s3 = require("aws-cdk-lib/aws-s3");
import iam = require("aws-cdk-lib/aws-iam");
import dynamodb = require("aws-cdk-lib/aws-dynamodb");
import lambda = require("aws-cdk-lib/aws-lambda");
import event_sources = require("aws-cdk-lib/aws-lambda-event-sources");
import sqs = require("aws-cdk-lib/aws-sqs");
import { Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");
import * as s3n from "aws-cdk-lib/aws-s3-notifications";

const imageBucketName = "cdk-rekn-imgagebucket";
const resizedBucketName = imageBucketName + "-resized";

export class AwsDevHourStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =====================================================================================
    // Image Bucket
    // =====================================================================================

    const imageBucket = new s3.Bucket(this, imageBucketName, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "imageBucket", { value: imageBucket.bucketName });

    // =====================================================================================
    // Thumbnail Bucket
    // =====================================================================================

    const resizedBucket = new s3.Bucket(this, resizedBucketName, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "resizedBucket", {
      value: resizedBucket.bucketName,
    });

    // =====================================================================================
    // Amazon DynamoDB table for storing image labels
    // =====================================================================================
    const table = new dynamodb.Table(this, "ImageLabels", {
      partitionKey: { name: "image", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "ddbTable", { value: table.tableName });

    // =====================================================================================
    // Building our AWS Lambda Function; compute for our serverless microservice
    // =====================================================================================

    const sharpLayer = new lambda.LayerVersion(this, "sharp-layer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      code: lambda.Code.fromAsset("layers/sharp"),
      description: "Uses a 3rd party library called Sharp to resize images.",
    });

    // =====================================================================================
    // Building our AWS Lambda Function; compute for our serverless microservice
    // =====================================================================================
    const rekFn = new NodejsFunction(this, "rekognitionFunction", {
      entry: path.join(__dirname, `../rekognitionlambda/index.ts`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        TABLE: table.tableName,
        BUCKET: imageBucket.bucketName,
        THUMBBUCKET: resizedBucket.bucketName,
      },
      bundling: {
        minify: false,
        externalModules: ["aws-sdk", "sharp", "/opt/nodejs/node_modules/sharp"],
      },
      layers: [sharpLayer],
    });

    imageBucket.grantRead(rekFn);
    table.grantWriteData(rekFn);
    resizedBucket.grantPut(rekFn);

    rekFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rekognition:DetectLabels"],
        resources: ["*"],
      })
    );

    // =====================================================================================
    // Building SQS queue and DeadLetter Queue
    // =====================================================================================
    const dlQueue = new sqs.Queue(this, "ImageDLQueue", {
      // is noy a good practice to give it a name for scalability reason
    });

    const queue = new sqs.Queue(this, "ImageQueue", {
      visibilityTimeout: cdk.Duration.seconds(30),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        maxReceiveCount: 2,
        queue: dlQueue,
      },
    });

    // =====================================================================================
    // Building S3 Bucket Create Notification to SQS
    // =====================================================================================
    imageBucket.addObjectCreatedNotification(new s3n.SqsDestination(queue), {
      suffix: ".jpeg",
    });

    // =====================================================================================
    // Lambda(Rekognition) to consume messages from SQS
    // =====================================================================================
    rekFn.addEventSource(new event_sources.SqsEventSource(queue));

    // =====================================================================================
    // Lambda for Synchronous Frond End
    // =====================================================================================

    const serviceFn = new NodejsFunction(this, "serviceFunction", {
      entry: path.join(__dirname, `../servicelambda/index.ts`),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        TABLE: table.tableName,
        BUCKET: imageBucket.bucketName,
        THUMBBUCKET: resizedBucket.bucketName,
      },
    });
    imageBucket.grantWrite(serviceFn);
    resizedBucket.grantWrite(serviceFn);
    table.grantReadWriteData(serviceFn);
  }
}

export type StackOutputs = {
  imageBucket: string;
  resizedBucket: string;
  ddbTable: string;
};
