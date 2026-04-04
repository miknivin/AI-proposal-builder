import { NextResponse } from "next/server";

import { ApiError } from "@/app/lib/errors";

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);

export const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
};

export const success = (
  data: Record<string, unknown> = {},
  init?: ResponseInit,
) => NextResponse.json({ success: true, ...data }, init);

export const handleRouteError = (error: unknown) => {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        code: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong.";

  return NextResponse.json(
    {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
    { status: 500 },
  );
};

export const sumServiceTotal = (
  services: Array<{ quantity?: number; unitPrice?: number; price?: number }>,
) =>
  services.reduce((sum, service) => {
    const quantity = Number(service.quantity ?? 1);
    const price = Number(service.unitPrice ?? service.price ?? 0);
    return sum + quantity * price;
  }, 0);
