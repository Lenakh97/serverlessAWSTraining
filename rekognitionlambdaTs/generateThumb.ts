import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { streamToBuffer } from "./streamToBuffer";
import { replaceSubstringWithColon } from "./replaceSubstringWithColon";
import { s3, sharp } from ".";

export const generateThumb = async (ourBucket: string, ourKey: string) => {
  // Clean the string to add the colon back into requested name
  const safeKey = replaceSubstringWithColon(ourKey);

  // Download file from s3 and store it in Lambda /tmp storage ??
  const image = await s3.send(
    new GetObjectCommand({
      Bucket: Bucket,
      Key: safeKey,
    })
  );

  const stream = image.Body as Readable;
  const buffer = await streamToBuffer(stream);

  const resizedImage = sharp(buffer).resize(200).toBuffer();

  //Upload the thumbnail to the thumbnail bucket
  await s3.send(
    new PutObjectCommand({
      Body: resizedImage,
      Bucket: ThumbBucket,
      Key: safeKey,
    })
  );
};
