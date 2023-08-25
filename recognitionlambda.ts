import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
//initialize s3, rekog client??, dynamoDB, thumbBucket?

const db = new DynamoDBClient({});

const minConfidense = 50;

export const handler = (event: Event) => {
  console.log("Lambda processing event: ", event);
  //For each message (photo) get the bucket name and key
  //For each bucket/key retrieve labels

  return;
};
export const generateThumb = (ourBucket: string, ourKey: string) => {
  // Download file from s3 and store it in Lambda/tmp storage
  // Resize image
  // Upload image to thumbnail bucket
  // Clean up files in /tmp so we don't run out of space
  return;
};

export const resizeImage = () => {
  //resize
};

export const rekFunction = (ourBucket: string, ourKey: string) => {
  // Retrieve labels from Amazon Rekognition, using te confidence level we set in minConfidense variable
  // Make array and dictionary for label construction
  // add all labels into the dict by iterating over response['Labels']
  // Instantiate a table resource object of our environment variable
  // Put item into table
  return;
};
