import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";

export const db = new DynamoDBClient({});
export const s3 = new S3Client({});
const docClient = DynamoDBDocumentClient.from(db);

const { Table, Bucket, ThumbBucket } = fromEnv({
  Table: "TABLE",
  Bucket: "BUCKET",
  ThumbBucket: "THUMBBUCKET",
})(process.env);

type handlerEvent = {
  action: string;
  key: string;
};

export const handler = async (event: handlerEvent) => {
  const action = event.action;
  const image = event.key;
  console.log("handler initiated");
  switch (action) {
    case "getLabels":
      const maybeLabels = await getLabels(image);
      if ("error" in maybeLabels) {
        console.error("Error getLabels(): ", maybeLabels.error);
      }
      break;
    case "deleteImage":
      const maybeDeletedImage = await deleteImage(image);
      if ("error" in maybeDeletedImage) {
        console.error("Error deleteImage(): ", maybeDeletedImage.error);
      }
      break;
  }
};

const getLabels = async (
  image: string
): Promise<{ success: QueryCommandOutput } | { error: Error }> => {
  const res = await docClient.send(
    new QueryCommand({
      TableName: Table,
      KeyConditionExpression: "image = :key",
      ExpressionAttributeValues: {
        ":key": { S: image },
      },
    })
  );
  if (res.Count === 0) {
    return { error: new Error("Labels not found.") };
  }
  console.log("Labels have been found in DynamoDB.");
  return { success: res };
};

const deleteImage = async (
  image: string
): Promise<{ success: boolean } | { error: Error }> => {
  const results = await Promise.all([
    deleteImageFromDynamoDB(image),
    deleteImageFromBucket(Bucket, image),
    deleteImageFromBucket(ThumbBucket, image),
  ]);
  for (const promise of results) {
    if ("error" in promise) {
      return { error: promise.error };
    }
  }
  return { success: true };
};

const deleteImageFromBucket = async (
  bucket: string,
  key: string
): Promise<{ success: boolean } | { error: Error }> => {
  const deletedImage = await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  if (deletedImage === undefined) {
    return { error: new Error(`Image not deleted from ${bucket}`) };
  }
  return { success: true };
};

const deleteImageFromDynamoDB = async (
  image: string
): Promise<{ success: boolean } | { error: Error }> => {
  const res = await docClient.send(
    new DeleteCommand({
      TableName: Table,
      Key: { image: image },
    })
  );
  if (res === undefined) {
    return { error: new Error("Item not deleted from DynamoDB") };
  }
  return { success: true };
};
