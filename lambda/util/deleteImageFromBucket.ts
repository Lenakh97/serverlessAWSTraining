import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const deleteImageFromBucket =
  (s3: S3Client) =>
  async (
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
