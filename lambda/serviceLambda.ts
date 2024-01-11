import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { getLabels } from "./util/getLabels";
import { deleteImage } from "./util/deleteImage";

export const db = new DynamoDBClient({});
export const s3 = new S3Client({});
export const docClient = DynamoDBDocumentClient.from(db);

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
      const maybeLabels = await getLabels(image, Table, docClient);
      if ("error" in maybeLabels) {
        console.error("Error getLabels(): ", maybeLabels.error);
        return maybeLabels.error;
      }
      return maybeLabels.success.Items;
    case "deleteImage":
      const maybeDeletedImage = await deleteImage(
        image,
        Table,
        docClient,
        Bucket,
        ThumbBucket
      );
      if ("error" in maybeDeletedImage) {
        console.error("Error deleteImage(): ", maybeDeletedImage.error);
        return maybeDeletedImage.error;
      }
      return maybeDeletedImage.success;
  }
  return new Error(
    "No action given. Give either 'getLabels' or 'deleteImage' as action."
  );
};
