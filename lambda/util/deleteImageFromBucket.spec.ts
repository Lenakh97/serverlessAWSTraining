import { describe, it, mock } from "node:test";
import { check, objectMatching } from "tsmatchers";
import { deleteImageFromBucket } from "./deleteImageFromBucket";
import type { S3Client } from "@aws-sdk/client-s3";

describe("deleteImageFromBucket()", () => {
  const key = "key";
  const bucket = "bucketName";
  it("should use AWS DynamoDBClient to delete image from S3 Bucket", async () => {
    const s3Send = mock.fn();
    const s3: S3Client = {
      send: s3Send,
    } as any;
    await deleteImageFromBucket(bucket, key, s3);

    //Check that the correct command is used?

    //check that the function is called with the correct arguments
    check((s3Send.mock.calls[0]?.arguments as unknown[])[0]).is(
      objectMatching({
        input: {
          Bucket: bucket,
          Key: key,
        },
      })
    );
  });
});
