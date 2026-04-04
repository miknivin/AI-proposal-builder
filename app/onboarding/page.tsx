import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/components/OnboardingForm";
import { getCurrentProfile } from "@/app/lib/auth/session";

export default async function OnboardingPage() {
  const session = await getCurrentProfile();

  if (!session?.user) {
    redirect("/login");
  }

  const profile = session.profile
    ? {
        name: session.profile.name,
        tagline: session.profile.tagline,
        about: session.profile.about,
        passion: session.profile.passion,
        contactIntro: session.profile.contactIntro,
        email: session.profile.email,
        phone: session.profile.phone,
        website: session.profile.website,
        addressLines: session.profile.addressLines,
        logoUrl: session.profile.logoUrl,
        coreServices: session.profile.coreServices,
        defaultPaymentTerms: session.profile.defaultPaymentTerms,
        accountDetails: session.profile.accountDetails,
        apartCards: session.profile.apartCards,
      }
    : null;

  return <OnboardingForm initialProfile={profile} userEmail={session.user.email} />;
}
