import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import s3 = require("aws-cdk-lib/aws-s3");
import iam = require("aws-cdk-lib/aws-iam");
import dynamodb = require("aws-cdk-lib/aws-dynamodb");
import lambda = require("aws-cdk-lib/aws-lambda");
import event_sources = require("aws-cdk-lib/aws-lambda-event-sources");
import { Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path = require("path");

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
    const layer = new lambda.LayerVersion(this, "pil", {
      code: lambda.Code.fromAsset("reklayer"),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_7],
      license: "Apache-2.0",
      description:
        "A layer to enable the PIL library in our Rekognition Lambda",
    });

    const sharpLayer = new lambda.LayerVersion(this, "sharp-layer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      code: lambda.Code.fromAsset("layers/sharp"),
      description: "Uses a 3rd party library called Sharp o resize images.",
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
      layers: [sharpLayer],
      bundling: {
        minify: false,
        externalModules: ["aws-sdk", "sharp", "opt/nodejs/node:modules/sharp"],
      },
      environment: {
        TABLE: table.tableName,
        BUCKET: imageBucket.bucketName,
        THUMBBUCKET: resizedBucket.bucketName,
      },
    });
    rekFn.addEventSource(
      new event_sources.S3EventSource(imageBucket, {
        events: [s3.EventType.OBJECT_CREATED],
      })
    );
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
    // Lambda for Synchronous Frond End
    // =====================================================================================

    const serviceFn = new lambda.Function(this, "serviceFunction", {
      code: lambda.Code.fromAsset("servicelambda"),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "index.handler",
      environment: {
        TABLE: table.tableName,
        BUCKET: imageBucket.bucketName,
        RESIZEDBUCKET: resizedBucket.bucketName,
      },
    });
    imageBucket.grantWrite(serviceFn);
    resizedBucket.grantWrite(serviceFn);
    table.grantReadWriteData(serviceFn);
  }
}
