import type { ProposalThreadDetail } from "@/app/types/proposal";

type Props = {
  thread: ProposalThreadDetail;
  selectedVersion: number;
  onSelectVersion: (version: number) => void;
  onOpenPdf: () => void;
};

export function ThreadViewer({
  thread,
  selectedVersion,
  onSelectVersion,
  onOpenPdf,
}: Props) {
  const selected =
    thread.versions.find((version) => version.version === selectedVersion) ??
    thread.versions[thread.versions.length - 1];

  return (
    <section className="panel rounded-[28px] p-5 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Proposal Chat</p>
          <h2 className="mt-2 text-2xl font-semibold">{thread.chatTitle}</h2>
          <p className="mt-2 text-sm text-muted">
            Prepared for {thread.preparedFor}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {thread.versions.map((version) => (
            <button
              key={version.version}
              type="button"
              className={`rounded-full px-3 py-1 text-sm ${
                version.version === selectedVersion
                  ? "bg-accent text-white"
                  : "border border-line bg-white"
              }`}
              onClick={() => onSelectVersion(version.version)}
            >
              v{version.version}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-line bg-surface-strong p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">Selected version</p>
            <p className="mt-1 text-lg font-semibold">{selected.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              className="button-secondary"
              onClick={onOpenPdf}
            >
              View PDF
            </button>
            <a
              className="text-accent underline"
              href={selected.pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download PDF
            </a>
          </div>
        </div>
        {selected.summary ? (
          <p className="mt-3 text-sm text-muted">{selected.summary}</p>
        ) : null}
      </div>

      <div className="rounded-[22px] border border-line bg-surface-strong p-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-muted">Chat transcript</p>
        </div>
        {thread.messages.length ? (
          thread.messages.map((message, index) => (
            <div
              key={`${message.role}-${message.createdAt ?? index}-${index}`}
              className={`rounded-[20px] px-4 py-3 ${
                message.role === "user"
                  ? "ml-auto max-w-3xl bg-accent/10"
                  : "mr-auto max-w-3xl bg-white"
              }`}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                <span>{message.role}</span>
                {message.version ? <span>v{message.version}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>
              {message.summary && message.summary !== message.content ? (
                <p className="mt-2 text-xs text-muted">{message.summary}</p>
              ) : null}
              {message.pdfUrl ? (
                <a
                  className="mt-3 inline-block text-sm text-accent underline"
                  href={message.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open version PDF
                </a>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No chat messages yet.</p>
        )}
      </div>
    </section>
  );
}

