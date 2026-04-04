import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/app/lib/auth/session";

export default async function HomePage() {
  const session = await getCurrentProfile();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.profile?.isComplete) {
    redirect("/onboarding");
  }

  redirect("/builder");
}
