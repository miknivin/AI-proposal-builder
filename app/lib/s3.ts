import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@/app/lib/env";

const getS3Client = () =>
  new S3Client({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
    },
  });

export const uploadPdfToS3 = async (key: string, body: Buffer) => {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.awsBucket,
      Key: key,
      Body: body,
      ContentType: "application/pdf",
    }),
  );

  return `https://${env.awsBucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
};
