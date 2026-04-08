type Props = {
  pdfUrl: string;
};

export function PdfPreviewModalBody({ pdfUrl }: Props) {
  return (
    <div className="min-h-[65vh] flex-1 p-4">
      <object
        data={pdfUrl}
        type="application/pdf"
        className="h-full w-full rounded-2xl min-h-[65vh] border border-line"
      >
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-line bg-surface-strong p-6 text-center">
          <div className="space-y-3">
            <p className="text-sm text-muted">
              PDF preview is not available in this browser.
            </p>
            <a
              className="text-accent underline"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open PDF
            </a>
          </div>
        </div>
      </object>
    </div>
  );
}
