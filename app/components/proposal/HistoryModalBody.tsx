import type { ProposalHistoryItem } from "@/app/types/proposal";
import { HistoryPanel } from "@/app/components/proposal/HistoryPanel";

type Props = {
  proposals: ProposalHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenChat: (proposalId: string) => void;
};

export function HistoryModalBody({
  proposals,
  loading,
  onRefresh,
  onOpenChat,
}: Props) {
  return (
    <div className="max-h-[70vh] overflow-y-auto p-4">
      <HistoryPanel
        proposals={proposals}
        loading={loading}
        onRefresh={onRefresh}
        onOpenChat={onOpenChat}
      />
    </div>
  );
}

