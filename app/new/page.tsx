import { ProposalWorkspace } from "@/app/components/ProposalWorkspace";
import { getProposalWorkspacePageData } from "@/app/lib/proposal/workspace-page";

export const dynamic = "force-dynamic";

export default async function NewChatPage() {
  const data = await getProposalWorkspacePageData();

  return <ProposalWorkspace {...data} initialProposalId={null} />;
}
