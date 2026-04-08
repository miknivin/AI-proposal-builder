import { ApiError } from "@/app/lib/errors";
import { handleRouteError } from "@/app/lib/utils";

export async function POST(request: Request) {
  try {
    void request;
    throw new ApiError(
      403,
      "REGISTRATION_DISABLED",
      "Registration is disabled. Please use an existing account.",
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
