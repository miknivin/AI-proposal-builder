import { NextResponse } from "next/server";

import { applySessionCookies, signToken, verifyPassword } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { ApiError } from "@/app/lib/errors";
import { handleRouteError, safeJson } from "@/app/lib/utils";
import { loginSchema } from "@/app/lib/schemas";
import User from "@/app/models/User";
import CompanyProfile from "@/app/models/CompanyProfile";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await safeJson(request));
    await dbConnect();

    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const isPasswordValid = await verifyPassword(body.password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const profile = await CompanyProfile.findOne({ userId: user._id });
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      isComplete: Boolean(profile?.isComplete),
    });

    applySessionCookies(
      response,
      signToken(user._id.toString()),
      Boolean(profile?.isComplete),
    );

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
