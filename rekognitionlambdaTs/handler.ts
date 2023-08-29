import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToBuffer } from "./streamToBuffer";
import { replaceSubstringWithColon } from "./replaceSubstringWithColon";

export const handler = () => {
  console.log("Lambda processing event:");
  //For each message (photo) get the bucket name and key
  //For each bucket/key, retrieve labels
  return;
};

export const generateThumb =
  ({
    s3,
    dstBucket,
    imageThumbnail,
  }: {
    s3: S3Client;
    dstBucket: string;
    imageThumbnail: (image: Buffer, size: number) => Promise<Buffer>;
  }) =>
  async (
    bucket: string,
    key: string
  ): Promise<{ success: boolean } | { error: Error }> => {
    console.log("Work in progress from generateThub", bucket, key);

    const photo = replaceSubstringWithColon(key);
    const srcKey = decodeURIComponent(photo.replace(/\+/g, " "));

    const typeMatch = /\.([^.]*)$/.exec(srcKey);
    if (typeMatch === null) {
      return {
        error: new Error(`Could not determine the image type of '${srcKey}'`),
      };
    }

    //Check that image type is supported
    const imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "png") {
      return { error: new Error(`Unsupported image type: ${imageType} `) };
    }

    //Download image from S3 bucket
    const originalImage = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: srcKey })
    );

    if (originalImage === undefined) {
      return {
        error: new Error(`Original image not found in ${bucket}/${srcKey}`),
      };
    }

    //???
    const stream = originalImage.Body as Readable;
    const buffer = await streamToBuffer(stream);

    const thumbNailWidth = 200;

    const resizedImage = await imageThumbnail(buffer, thumbNailWidth);
    if (resizedImage === undefined) {
      return { error: new Error(`Failed to resize image ${bucket}/${srcKey}`) };
    }

    //Upload the thumbnail image to the destination bucket
    const uploadThumbnail = await s3.send(
      new PutObjectCommand({
        Bucket: dstBucket,
        Key: srcKey,
        Body: resizedImage,
        ContentType: "image",
      })
    );
    if (uploadThumbnail === undefined) {
      return {
        error: new Error(
          `Failed to upload resize image ${dstBucket}/${srcKey}`
        ),
      };
    }

    console.log(
      "Successfully resized " +
        bucket +
        "/" +
        srcKey +
        " and uploaded to " +
        dstBucket +
        "/" +
        srcKey
    );

    return { success: true };
  };

export const rekFunction = () => {};
