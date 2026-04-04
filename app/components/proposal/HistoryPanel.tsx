type Props = {
  proposals: Array<{
    id: string;
    title: string;
    preparedFor: string;
    summary: string;
    pdfUrl: string;
    version: number;
  }>;
  loading: boolean;
  onRefresh: () => void;
};

export function HistoryPanel({ proposals, loading, onRefresh }: Props) {
  return (
    <section className="panel rounded-[28px] p-5 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Proposal History</p>
          <h2 className="mt-2 text-2xl font-semibold">Saved proposals</h2>
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
              <p className="font-semibold">{proposal.title}</p>
              <p className="mt-1 text-sm text-muted">
                Prepared for {proposal.preparedFor}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-white px-3 py-1">
                  v{proposal.version}
                </span>
                <a
                  className="text-accent underline"
                  href={proposal.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open PDF
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
