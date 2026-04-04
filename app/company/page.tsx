import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/components/OnboardingForm";
import { getCurrentProfile } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const session = await getCurrentProfile();

  if (!session?.user) {
    redirect("/login");
  }

  const plainProfile = session.profile
    ? JSON.parse(JSON.stringify(session.profile))
    : null;

  const profile = plainProfile
    ? {
        name: plainProfile.name,
        tagline: plainProfile.tagline,
        about: plainProfile.about,
        passion: plainProfile.passion,
        contactIntro: plainProfile.contactIntro,
        email: plainProfile.email,
        phone: plainProfile.phone,
        website: plainProfile.website,
        addressLines: plainProfile.addressLines,
        logoUrl: plainProfile.logoUrl,
        coreServices: plainProfile.coreServices,
        defaultPaymentTerms: plainProfile.defaultPaymentTerms,
        accountDetails: plainProfile.accountDetails,
        apartCards: plainProfile.apartCards,
      }
    : null;

  return (
    <OnboardingForm
      initialProfile={profile}
      userEmail={session.user.email}
    />
  );
}
