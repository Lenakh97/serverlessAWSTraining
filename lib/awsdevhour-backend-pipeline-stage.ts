import { AwsDevHourStack } from "./aws_dev_hour-stack";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";


/**
 * Deployable unit of awsdevhour-backend app
 * */
export class AwsdevhourBackendPipelineStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    new AwsDevHourStack(this, "AwsdevhourBackendStack-dev");
  }
}
