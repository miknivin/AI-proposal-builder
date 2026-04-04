import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookies, requireUserFromRequest } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { handleRouteError } from "@/app/lib/utils";
import CompanyProfile from "@/app/models/CompanyProfile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const profile = await CompanyProfile.findOne({ userId: user._id }).lean();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      companyProfileComplete: Boolean(profile?.isComplete),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
