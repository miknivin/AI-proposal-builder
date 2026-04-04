import type { ProposalSpecificDraft } from "@/app/types/proposal";

type Props = {
  draft: ProposalSpecificDraft;
  isPending: boolean;
  onFinalize: () => void;
};

export function ReviewSection({ draft, isPending, onFinalize }: Props) {
  return (
    <section className="panel rounded-[28px] p-5 md:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Step 3</p>
            <h2 className="mt-2 text-2xl font-semibold">Review structured draft</h2>
          </div>
          <button type="button" className="button-primary" disabled={isPending} onClick={onFinalize}>
            {isPending ? "Finalizing..." : "Finalize proposal"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-line bg-surface-strong p-5">
            <p className="text-sm font-medium text-muted">Title</p>
            <p className="mt-2 text-xl font-semibold">{draft.title}</p>
          </div>
          <div className="rounded-[24px] border border-line bg-surface-strong p-5">
            <p className="text-sm font-medium text-muted">Prepared for</p>
            <p className="mt-2 text-xl font-semibold">{draft.preparedFor}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-line bg-surface-strong p-5">
          <p className="text-sm font-medium text-muted">Services</p>
          <div className="mt-4 space-y-3">
            {draft.services.map((service) => (
              <div key={`${service.title}-${service.description}`} className="rounded-[18px] bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="font-semibold">{service.title}</p>
                <p className="text-sm text-muted">
                  Qty {service.quantity ?? 1} | ₹{service.unitPrice ?? service.price ?? 0}
                </p>
                </div>
                {service.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted">{service.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
