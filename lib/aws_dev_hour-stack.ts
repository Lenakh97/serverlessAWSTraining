import * as cdk from "aws-cdk-lib";
import { Stack, aws_iam as IAM, App } from "aws-cdk-lib";
import s3, { HttpMethods } from "aws-cdk-lib/aws-s3";
import dynamodb from "aws-cdk-lib/aws-dynamodb";
import lambda from "aws-cdk-lib/aws-lambda";
import event_sources from "aws-cdk-lib/aws-lambda-event-sources";
import sqs from "aws-cdk-lib/aws-sqs";
import { Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path from "path";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { CD } from "./CD";
import { STACK_NAME } from "./stackConfig";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { AuthorizationType } from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

export class AwsDevHourStack extends Stack {
  public constructor(
    parent: App,
    {
      repository,
      gitHubOIDCProviderArn,
    }: {
      repository: {
        owner: string;
        repo: string;
      };
      gitHubOIDCProviderArn: string;
    }
  ) {
    super(parent, STACK_NAME);

    // =====================================================================================
    // Image Bucket
    // =====================================================================================
    const imageBucket = new s3.Bucket(this, "cdk-rekn-imgagebucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "imageBucket", { value: imageBucket.bucketName });
    const imageBucketArn = imageBucket.bucketArn;

    imageBucket.addCorsRule({
      allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
      maxAge: 3000,
    });

    // =====================================================================================
    // Thumbnail Bucket
    // =====================================================================================

    const resizedBucket = new s3.Bucket(this, "cdk-rekn-imgagebucket-resized", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    new cdk.CfnOutput(this, "resizedBucket", {
      value: resizedBucket.bucketName,
    });
    const resizedBucketArn = resizedBucket.bucketArn;

    resizedBucket.addCorsRule({
      allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
      maxAge: 3000,
    });

    // =====================================================================================
    // Website bucket
    // =====================================================================================
    const webBucket = new s3.Bucket(this, "cdk-rekn-publicbucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });

    new cdk.CfnOutput(this, "bucketURL", {
      value: webBucket.bucketWebsiteDomainName,
    });
    // =====================================================================================
    // Deploy site contents to S3 Bucket
    // =====================================================================================
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset("./public")],
      destinationBucket: webBucket,
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
      // TODO: Use current LTS Node.js version: 20
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      code: lambda.Code.fromAsset("layers/sharp"),
      description: "Uses a 3rd party library called Sharp to resize images.",
    });

    // =====================================================================================
    // Building our AWS Lambda Function; compute for our serverless microservice
    // =====================================================================================
    const rekFn = new NodejsFunction(this, "rekognitionFunction", {
      entry: path.join(process.cwd(), `../lambda/rekognitionLambda.ts`),
      // TODO: Use current LTS Node.js version: 20
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
      new IAM.PolicyStatement({
        effect: IAM.Effect.ALLOW,
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
      prefix: "private/",
    });

    // =====================================================================================
    // Lambda(Rekognition) to consume messages from SQS
    // =====================================================================================
    rekFn.addEventSource(new event_sources.SqsEventSource(queue));

    // =====================================================================================
    // Lambda for Synchronous Frond End
    // =====================================================================================

    const serviceFn = new NodejsFunction(this, "serviceFunction", {
      entry: path.join(process.cwd(), `../lambda/serviceLambda.ts`),
      // TODO: Use current LTS Node.js version: 20
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

    // Set up role for CD
    const gitHubOIDC = IAM.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "gitHubOICDProvider",
      gitHubOIDCProviderArn
    );
    const cd = new CD(this, { repository, gitHubOIDC });

    new cdk.CfnOutput(this, "cdRoleArn", {
      exportName: `${this.stackName}:cdRoleArn`,
      description: "Role to use in GitHub Actions",
      value: cd.role.roleArn,
    });

    const api = new apigw.LambdaRestApi(this, "imageAPI", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
      handler: serviceFn,
      proxy: false,
    });
    // =====================================================================================
    // Cognito User Pool Authentication
    // =====================================================================================
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true, // Allow user to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { username: true, email: true }, // Set email as an alias
    });
    /**
     * Allows unauthenticated requests, like if you forget password.
     */
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
      authFlows: {
        adminUserPassword: true, // Enable admin based user password authentication flow
        userSrp: true, //Enable SRP based authentication
      },
    });
    const developerProviderName = "developerAuthenticated";
    /**
     * Gives the user permission to do things, like upload image and access web page.
     * Identity Pool exchanges tokens from authenticated users for AWS credentials.
     */
    const identityPool = new cognito.CfnIdentityPool(
      this,
      "ImageRekognitionIdentityPool",
      {
        allowUnauthenticatedIdentities: false, // Don't allow unauthenticated users
        cognitoIdentityProviders: [
          {
            clientId: userPoolClient.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
        developerProviderName,
      }
    );
    /**
     * Telling api gateway that we want to use an authorizer
     */
    const auth = new apigw.CfnAuthorizer(this, "APIGatewayAuthorizer", {
      name: "customer-authorizer",
      identitySource: "method.request.header.Authorization",
      providerArns: [userPool.userPoolArn],
      restApiId: api.restApiId,
      type: AuthorizationType.COGNITO,
    });
    /**
     * Roles to provide access to resources in the backend.
     */
    const authenticatedRole = new IAM.Role(
      this,
      "ImageRekognitionAuthenticatedRole",
      {
        assumedBy: new IAM.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
      }
    );

    // IAM policy granting users permission to upload, download and delete their own pictures
    authenticatedRole.addToPolicy(
      new IAM.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        effect: IAM.Effect.ALLOW,
        resources: [
          imageBucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
          imageBucketArn + "/private/${cognito-identity.amazonaws.com:sub}",
          resizedBucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
          resizedBucketArn + "/private/${cognito-identity.amazonaws.com:sub}",
        ],
      })
    );

    // IAM policy granting users permission to list their pictures
    authenticatedRole.addToPolicy(
      new IAM.PolicyStatement({
        actions: ["s3:ListBucket"],
        effect: IAM.Effect.ALLOW,
        resources: [imageBucketArn, resizedBucketArn],
        conditions: {
          StringLike: {
            "s3:prefix": ["private/${cognito-identity.amazonaws.com:sub}/*"],
          },
        },
      })
    );
    /**
     * Connect role to identity pool
     */
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "ItentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: { authenticated: authenticatedRole.roleArn },
      }
    );

    // Export values of Cognito
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "AppClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });
    new cdk.CfnOutput(this, "developerProviderName", {
      value: developerProviderName,
    });

    // =====================================================================================
    // This construct builds a new Amazon API Gateway with AWS Lambda Integration
    // =====================================================================================
    const lambdaIntegration = new apigw.LambdaIntegration(serviceFn, {
      proxy: false,
      requestParameters: {
        "integration.request.querystring.action":
          "method.request.querystring.action",
        "integration.request.querystring.key": "method.request.querystring.key",
      },
      requestTemplates: {
        "application/json": JSON.stringify({
          action: "$util.escapeJavaScript($input.params('action'))",
          key: "$util.escapeJavaScript($input.params('key'))",
        }),
      },
      passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_TEMPLATES,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
        },
        {
          selectionPattern: "(\n|.)+",
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
        },
      ],
    });

    // =====================================================================================
    // API Gateway
    // =====================================================================================
    const imageAPI = api.root.addResource("images");

    // GET /images
    imageAPI.addMethod("GET", lambdaIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: { authorizerId: auth.ref },
      requestParameters: {
        "method.request.querystring.action": true,
        "method.request.querystring.key": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    // DELETE /images
    imageAPI.addMethod("DELETE", lambdaIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: { authorizerId: auth.ref },
      requestParameters: {
        "method.request.querystring.action": true,
        "method.request.querystring.key": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    });

    new cdk.CfnOutput(this, "imageApi", {
      exportName: `${this.stackName}:imageAPI`,
      value: api.url,
    });
  }
}

export type StackOutputs = {
  imageBucket: string;
  resizedBucket: string;
  ddbTable: string;
  cdRoleArn: string;
  imageApi: string;
  UserPoolId: string;
  AppClientId: string;
  IdentityPoolId: string;
  developerProviderName: string;
};
