import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, COMPANY_PROFILE_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/app/lib/constants";
import { ApiError } from "@/app/lib/errors";
import { env } from "@/app/lib/env";
import { dbConnect } from "@/app/lib/db/connection";
import User from "@/app/models/User";
import CompanyProfile from "@/app/models/CompanyProfile";

type JwtPayload = {
  id: string;
};

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const verifyPassword = (password: string, hashedPassword: string) =>
  bcrypt.compare(password, hashedPassword);

export const signToken = (userId: string) =>
  jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });

export const verifyToken = (token: string) =>
  jwt.verify(token, env.jwtSecret) as JwtPayload;

export const getTokenFromRequest = (request: NextRequest) =>
  request.cookies.get(AUTH_COOKIE_NAME)?.value;

export const getTokenFromServerCookies = async () =>
  (await cookies()).get(AUTH_COOKIE_NAME)?.value;

export const getAuthenticatedUserFromToken = async (token: string) => {
  await dbConnect();
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "Session is no longer valid.");
  }

  return user;
};

export const requireUserFromRequest = async (request: NextRequest) => {
  const token = getTokenFromRequest(request);

  if (!token) {
    throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue.");
  }

  return getAuthenticatedUserFromToken(token);
};

export const getCurrentUser = async () => {
  const token = await getTokenFromServerCookies();
  if (!token) {
    return null;
  }

  try {
    return await getAuthenticatedUserFromToken(token);
  } catch {
    return null;
  }
};

export const getCurrentProfile = async () => {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  await dbConnect();
  const profile = await CompanyProfile.findOne({ userId: user._id }).lean();
  return {
    user,
    profile,
  };
};

export const applySessionCookies = (
  response: NextResponse,
  token: string,
  isComplete: boolean,
) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
  response.cookies.set(COMPANY_PROFILE_COOKIE_NAME, isComplete ? "1" : "0", cookieOptions);
};

export const clearSessionCookies = (response: NextResponse) => {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(COMPANY_PROFILE_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
};
