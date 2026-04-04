import { COMPANY_INCOMPLETE_CODE } from "@/app/lib/constants";
import { ApiError } from "@/app/lib/errors";
import CompanyProfile from "@/app/models/CompanyProfile";

export const findCompanyProfileByUserId = async (userId: string) =>
  CompanyProfile.findOne({ userId });

export const requireCompleteCompanyProfile = async (userId: string) => {
  const profile = await findCompanyProfileByUserId(userId);

  if (!profile || !profile.isComplete) {
    throw new ApiError(
      403,
      COMPANY_INCOMPLETE_CODE,
      "Complete company onboarding before generating proposals.",
    );
  }

  return profile;
};
