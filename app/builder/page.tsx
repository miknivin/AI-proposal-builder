import { redirect } from "next/navigation";

import { ProposalWorkspace } from "@/app/components/ProposalWorkspace";
import { getCurrentProfile } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import Proposal from "@/app/models/Proposal";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const session = await getCurrentProfile();

  if (!session?.user) {
    redirect("/login");
  }

  await dbConnect();
  const proposals = await Proposal.find({ userId: session.user._id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <ProposalWorkspace
      userName={session.user.name}
      companyName={session.profile?.name ?? ""}
      profileComplete={Boolean(session.profile?.isComplete)}
      initialProposals={proposals.map((proposal) => ({
        id: proposal._id.toString(),
        title: proposal.title,
        preparedFor: proposal.preparedFor,
        summary: proposal.summary,
        pdfUrl: proposal.pdfUrl,
        version: proposal.version,      }))}
    />
  );
}


