import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { getLabels } from "./serviceLambda/getLabels";
import { deleteImageFromDynamoDB } from "./serviceLambda/deleteImageFromDynamoDB";
import { deleteImageFromBucket } from "./serviceLambda/deleteImageFromBucket";

const db = new DynamoDBClient({});
const s3 = new S3Client({});
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

const deleteImageFile = deleteImageFromBucket(s3);

const deleteImageDBData = (key: string) =>
  deleteImageFromDynamoDB(key, Table, docClient);

export const handler = async (event: handlerEvent) => {
  const action = event.action;
  const image = event.key;
  console.log("handler initiated");
  switch (action) {
    case "getLabels":
      const maybeLabels = await getLabels(image, Table, docClient);
      if ("error" in maybeLabels) {
        console.error("Error getLabels(): ", maybeLabels.error);
        return maybeLabels.error;
      }
      return maybeLabels.success.Items;
    case "deleteImage":
      const results = await Promise.all([
        deleteImageDBData(image),
        deleteImageFile(Bucket, image),
        deleteImageFile(ThumbBucket, image),
      ]);

      const images: string[] = ["image1", "image2"];
      await Promise.all(images.map(deleteImageDBData));

      for (const promise of results) {
        if ("error" in promise) {
          console.error("Error deleteImage(): ", promise.error);
          return { error: promise.error };
        }
      }
      return { success: true };
  }
  return new Error(
    "No action given. Give either 'getLabels' or 'deleteImage' as action."
  );
};
