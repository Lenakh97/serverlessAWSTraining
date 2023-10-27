#!/usr/bin/env node
import { AwsDevHourStack } from "../lib/aws_dev_hour-stack.js";
import { App } from "aws-cdk-lib";

export type Repository = {
  owner: string;
  repo: string;
};

export class AwsDevHourApp extends App {
  public constructor({
    repository,
    gitHubOIDCProviderArn,
    version,
  }: {
    repository: Repository;
    gitHubOIDCProviderArn: string;
    version: string;
  }) {
    super({
      context: {
        version,
      },
    });

    new AwsDevHourStack(this, {
      repository,
      gitHubOIDCProviderArn,
    });
  }
}
