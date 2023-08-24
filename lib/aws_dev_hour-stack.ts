import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import s3 = require("aws-cdk-lib/aws-s3");
import iam = require("aws-cdk-lib/aws-iam");
import dynamodb = require("aws-cdk-lib/aws-dynamodb");
import lambda = require("aws-cdk-lib/aws-lambda");
import event_sources = require("aws-cdk-lib/aws-lambda-event-sources");
import { Duration } from "aws-cdk-lib";

const imageBucketName = "cdk-rekn-imgagebucket";
export class AwsDevHourStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // =====================================================================================
    // Image Bucket
    // =====================================================================================

    const imageBucket = new s3.Bucket(this, imageBucketName);
    new cdk.CfnOutput(this, "imageBucket", { value: imageBucket.bucketName });

    // =====================================================================================
    // Amazon DynamoDB table for storing image labels
    // =====================================================================================
    const table = new dynamodb.Table(this, "ImageLabels", {
      partitionKey: { name: "image", type: dynamodb.AttributeType.STRING },
    });
    new cdk.CfnOutput(this, "ddbTable", { value: table.tableName });

    // =====================================================================================
    // Building our AWS Lambda Function; compute for our serverless microservice
    // =====================================================================================
    const rekFn = new lambda.Function(this, "rekognitionFunction", {
      code: lambda.Code.fromAsset("rekognitionlambda"),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: "index.handler",
      timeout: Duration.seconds(30),
      memorySize: 1024,
      environment: {
        TABLE: table.tableName,
        BUCKET: imageBucket.bucketName,
      },
    });
    rekFn.addEventSource(
      new event_sources.S3EventSource(imageBucket, {
        events: [s3.EventType.OBJECT_CREATED],
      })
    );
    imageBucket.grantRead(rekFn);
    table.grantWriteData(rekFn);

    rekFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rekognition:DetectLabels"],
        resources: ["*"],
      })
    );
  }
}
