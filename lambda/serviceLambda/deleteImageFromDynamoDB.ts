import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const deleteImageFromDynamoDB = async (
  image: string,
  Table: string,
  docClient: DynamoDBDocumentClient
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
