import { NextRequest, NextResponse } from "next/server";

import { applySessionCookies, getTokenFromRequest, requireUserFromRequest } from "@/app/lib/auth/session";
import { companyProfileSchema } from "@/app/lib/schemas";
import { dbConnect } from "@/app/lib/db/connection";
import { handleRouteError, safeJson } from "@/app/lib/utils";
import CompanyProfile from "@/app/models/CompanyProfile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const profile = await CompanyProfile.findOne({ userId: user._id }).lean();

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    const body = companyProfileSchema.parse(await safeJson(request));
    await dbConnect();

    const profile = await CompanyProfile.findOneAndUpdate(
      { userId: user._id },
      {
        ...body,
        website: body.website || undefined,
        accountDetails: {
          ...body.accountDetails,
          qrImage: body.accountDetails.qrImage || undefined,
        },
        isComplete: true,
      },
      {
        new: true,
        upsert: true,
      },
    );

    const response = NextResponse.json({
      success: true,
      profile,
    });
    const token = getTokenFromRequest(request);
    if (token) {
      applySessionCookies(response, token, true);
    }

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
