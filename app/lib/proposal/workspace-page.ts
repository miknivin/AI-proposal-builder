/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { mapProposalToHistoryItem } from "@/app/lib/proposal/thread";
import Proposal from "@/app/models/Proposal";

export const getProposalWorkspacePageData = async () => {
  const session = await getCurrentProfile();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.profile?.isComplete) {
    redirect("/onboarding");
  }

  await dbConnect();
  const proposals = await Proposal.find({ userId: session.user._id })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    userName: session.user.name,
    companyName: session.profile?.name ?? "",
    profileComplete: Boolean(session.profile?.isComplete),
    initialProposals: proposals.map((proposal) =>
      mapProposalToHistoryItem(proposal as any),
    ),
  };
};
