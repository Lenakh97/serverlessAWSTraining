import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToBuffer } from "./streamToBuffer";
import { replaceSubstringWithColon } from "../lambda/util/replaceSubstringWithColon";
import sharpType from "sharp";
// @ts-ignore
import * as sharpModule from "/opt/nodejs/node_modules/sharp"; // Uses the location of the module IN the layer

export const sharp = sharpModule.default as typeof sharpType;

export const generateThumb = async (
  ourBucket: string,
  ourKey: string,
  thumbBucket: string,
  s3Client: S3Client
): Promise<{ success: boolean } | { error: Error }> => {
  // Clean the string to add the colon back into requested name
  const safeKey = replaceSubstringWithColon(ourKey);

  // Download file from s3 and store it in buffer
  const image = await s3Client.send(
    new GetObjectCommand({
      Bucket: ourBucket,
      Key: safeKey,
    })
  );

  if (image === undefined) {
    return { error: new Error(`Image not found in bucket ${ourBucket}`) };
  }

  const stream = image.Body as Readable;
  const buffer = await streamToBuffer(stream);

  const resizedImage = await sharp(buffer).resize(200).toBuffer();
  if (resizedImage === undefined) {
    return { error: new Error(`Failed to resize image.`) };
  }

  //Upload the thumbnail to the thumbnail bucket
  const uploadThumb = await s3Client.send(
    new PutObjectCommand({
      Body: resizedImage,
      Bucket: thumbBucket,
      Key: safeKey,
    })
  );
  if (uploadThumb === undefined) {
    return {
      error: new Error(
        `Failed to upload thumbnail image to bucket: ${thumbBucket}`
      ),
    };
  }

  return { success: true };
};
