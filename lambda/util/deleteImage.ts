import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { deleteImageFromDynamoDB } from "./deleteImageFromDynamoDB";
import { deleteImageFromBucket } from "./deleteImageFromBucket";
import { s3 } from "../serviceLambda";

export const deleteImage = async (
  image: string,
  Table: string,
  docClient: DynamoDBDocumentClient,
  Bucket: string,
  ThumbBucket: string
): Promise<{ success: boolean } | { error: Error }> => {
  const results = await Promise.all([
    deleteImageFromDynamoDB(image, Table, docClient),
    deleteImageFromBucket(Bucket, image, s3),
    deleteImageFromBucket(ThumbBucket, image, s3),
  ]);
  for (const promise of results) {
    if ("error" in promise) {
      return { error: promise.error };
    }
  }
  return { success: true };
};
