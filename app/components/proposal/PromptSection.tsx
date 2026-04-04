import { useState } from "react";
import { Spinner } from "@/app/components/Spinner";

type Props = {
  preparedFor: string;
  prompt: string;
  isPending: boolean;
  disabled?: boolean;
  onPreparedFor: (value: string) => void;
  onPrompt: (value: string) => void;
  onSubmit: () => void;
};

export function PromptSection({
  preparedFor,
  prompt,
  isPending,
  disabled,
  onPreparedFor,
  onPrompt,
  onSubmit,
}: Props) {
  const [showPrompt, setShowPrompt] = useState(false);
  const missingPrepared = !preparedFor.trim();

  return (
    <div className="w-full rounded-[18px] border border-line bg-white px-4 py-3 shadow-lg space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 field">
        <label className="flex-1 min-w-55 grid gap-1 text-sm">
          <span className="font-medium">Prepared for</span>
          <input
            className="border-0 outline-0"
            value={preparedFor}
            onChange={(event) => onPreparedFor(event.target.value)}
            placeholder="Client or brand name"
            disabled={disabled}
          />
        </label>
        {!showPrompt ? (
          <button
            type="button"
          className="button-secondary whitespace-nowrap"
            disabled={disabled || missingPrepared}
            onClick={() => {
              if (!missingPrepared) setShowPrompt(true);
            }}
          >
            {missingPrepared ? "Add client name" : "Continue"}
          </button>
        ) : null}
      </div>

      {showPrompt && (
        <div
          className={`flex items-center justify-center gap-2 transition-opacity textarea`}
        >
          <textarea
            className=" flex-1 border-0 outline-0"
            value={prompt}
            onChange={(event) => onPrompt(event.target.value)}
            placeholder="Describe what you need. Example: Website redesign with CMS, SEO, and launch support."
            disabled={disabled}
            rows={1}
          />
        <button
          type="button"
          className="button-primary self-end whitespace-nowrap flex items-center justify-center gap-1"
          disabled={isPending || disabled || !showPrompt}
          onClick={onSubmit}
        >
          {isPending ? (
            <>
              <Spinner size={18} />
              <span className="text-sm">Generating...</span>
            </>
          ) : disabled ? (
            <span className="text-sm">Complete profile first</span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
