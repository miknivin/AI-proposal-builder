import { ProposalWorkspace } from "@/app/components/ProposalWorkspace";
import { getProposalWorkspacePageData } from "@/app/lib/proposal/workspace-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ chatid: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { chatid } = await params;
  const data = await getProposalWorkspacePageData();

  return <ProposalWorkspace {...data} initialProposalId={chatid} />;
}
