import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToBuffer } from "./streamToBuffer";
import { replaceSubstringWithColon } from "./replaceSubstringWithColon";
import sharpType from "sharp";
import * as sharpModule from "/opt/nodejs/node_modules/sharp"; // Uses the location of the module IN the layer

export const sharp = sharpModule.default as typeof sharpType;

export const generateThumb = async (
  ourBucket: string,
  ourKey: string,
  thumbBucket: string,
  s3: S3Client
) => {
  // Clean the string to add the colon back into requested name
  const safeKey = replaceSubstringWithColon(ourKey);

  // Download file from s3 and store it in Lambda /tmp storage ??
  const image = await s3.send(
    new GetObjectCommand({
      Bucket: ourBucket,
      Key: safeKey,
    })
  );

  const stream = image.Body as Readable;
  const buffer = await streamToBuffer(stream);

  const resizedImage = await sharp(buffer).resize(200).toBuffer();

  //Upload the thumbnail to the thumbnail bucket
  await s3.send(
    new PutObjectCommand({
      Body: resizedImage,
      Bucket: thumbBucket,
      Key: safeKey,
    })
  );
};
