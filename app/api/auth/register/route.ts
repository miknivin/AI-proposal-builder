import { NextResponse } from "next/server";

import { applySessionCookies, hashPassword, signToken } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { ApiError } from "@/app/lib/errors";
import { handleRouteError, safeJson } from "@/app/lib/utils";
import { registerSchema } from "@/app/lib/schemas";
import User from "@/app/models/User";
import CompanyProfile from "@/app/models/CompanyProfile";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await safeJson(request));
    await dbConnect();

    const existingUser = await User.findOne({ email: body.email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "An account already exists for this email.");
    }

    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      password: await hashPassword(body.password),
    });

    await CompanyProfile.create({
      userId: user._id,
      name: "",
      tagline: "",
      about: "",
      passion: "",
      contactIntro: "",
      email: body.email.toLowerCase(),
      phone: "",
      website: "",
      addressLines: [],
      logoUrl: "",
      coreServices: [],
      defaultPaymentTerms: [],
      accountDetails: {},
      apartCards: [],
      isComplete: false,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

    applySessionCookies(response, signToken(user._id.toString()), false);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
