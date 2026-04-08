import type { ProposalHistoryItem } from "@/app/types/proposal";

type Props = {
  proposals: ProposalHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onOpenChat: (proposalId: string) => void;
};

export function HistoryPanel({ proposals, loading, onRefresh, onOpenChat }: Props) {
  return (
    <section className="panel rounded-[28px] p-5 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Proposal History</p>
          <h2 className="mt-2 text-2xl font-semibold">Saved proposal chats</h2>
        </div>
        <button
          type="button"
          className="button-secondary px-4 py-2 text-sm"
          onClick={onRefresh}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {proposals.length ? (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-[22px] border border-line bg-surface-strong p-4"
            >
              <p className="font-semibold">{proposal.chatTitle}</p>
              <p className="mt-1 text-sm text-muted">
                Prepared for {proposal.preparedFor}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-white px-3 py-1">
                  v{proposal.latestVersion}
                </span>
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => onOpenChat(proposal.id)}
                >
                  Open chat
                </button>
                <a
                  className="text-accent underline"
                  href={proposal.latestPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open latest PDF
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-line bg-surface-strong p-4 text-sm text-muted">
            No proposals saved yet.
          </div>
        )}
      </div>
    </section>
  );
}
