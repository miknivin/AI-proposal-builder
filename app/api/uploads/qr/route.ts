import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/app/lib/env";
import { requireUserFromRequest } from "@/app/lib/auth/session";
import { handleRouteError, safeJson, slugify } from "@/app/lib/utils";

const MAX_SIZE_BYTES = 3 * 1024 * 1024;

type PresignBody = {
  filename: string;
  contentType: string;
  size: number;
  kind?: "qr" | "logo";
};

const s3 = new S3Client({
  region: env.awsRegion,
  credentials: {
    accessKeyId: env.awsAccessKeyId,
    secretAccessKey: env.awsSecretAccessKey,
  },
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    const body = (await safeJson(request)) as PresignBody;

    if (!body.filename || !body.contentType || !body.size) {
      return NextResponse.json(
        { success: false, message: "filename, contentType, and size are required" },
        { status: 400 },
      );
    }

    if (body.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "File too large (max 3MB)" },
        { status: 400 },
      );
    }

    const folder = body.kind === "logo" ? "logo" : "qr";
    const key = `uploads/${folder}/${user._id}/${Date.now()}-${slugify(body.filename)}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: env.awsBucket,
        Key: key,
        ContentType: body.contentType,
      }),
      { expiresIn: 60 * 5 },
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      publicUrl: `https://${env.awsBucket}.s3.${env.awsRegion}.amazonaws.com/${key}`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}





