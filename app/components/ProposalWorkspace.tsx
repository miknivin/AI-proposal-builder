/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { HistoryPanel } from "@/app/components/proposal/HistoryPanel";
import { PromptSection } from "@/app/components/proposal/PromptSection";
import { QuestionnaireSection } from "@/app/components/proposal/QuestionnaireSection";
import {
  defaultServiceColumns,
  type ServiceColumn,
} from "@/app/components/proposal/types";
import {
  useDraftProposalMutation,
  useFinalizeProposalMutation,
  useListProposalsQuery,
} from "@/app/lib/state/proposalApi";
import { useLogoutMutation } from "@/app/lib/state/authApi";
import { useAppSelector } from "@/app/lib/state/store";
import type {
  ProposalSpecificDraft,
  QuestionnaireAnswer,
  QuestionnaireItem,
} from "@/app/types/proposal";
import { Spinner } from "@/app/components/Spinner";
import Link from "next/link";

const IconEdit = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const IconLogout = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconHistory = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 3 3 12 12 12" />
    <path d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);
const IconX = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconUser = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

type Props = {
  userName: string;
  companyName: string;
  profileComplete: boolean;
  initialProposals: Array<{
    id: string;
    title: string;
    preparedFor: string;
    summary: string;
    pdfUrl: string;
    version: number;
  }>;
};

type DraftState = {
  conversationId?: string;
  summary?: string;
  questionnaire?: QuestionnaireItem[];
  proposalSpecific?: ProposalSpecificDraft;
};

const deriveServiceColumns = (questions: QuestionnaireItem[] | undefined) => {
  const map: Record<string, ServiceColumn[]> = {};
  questions?.forEach((q) => {
    if (q.type === "services") {
      map[q.id] = q.servicesTemplate?.columns ?? defaultServiceColumns;
    }
  });
  return map;
};

const buildEmptyAnswers = (
  questions: QuestionnaireItem[] | undefined,
  serviceColumns: Record<string, ServiceColumn[]>,
): QuestionnaireAnswer[] =>
  (questions ?? []).map((question) => ({
    questionId: question.id,
    type: question.type,
    value: "",
    selectedOptionIds: [],
    customTexts: {},
    servicesItems:
      question.type === "services"
        ? (question.servicesTemplate?.defaults ?? [
            Object.fromEntries(
              (serviceColumns[question.id] ?? defaultServiceColumns).map(
                (c) => [c.id, ""],
              ),
            ),
          ])
        : undefined,
  }));

export function ProposalWorkspace({
  userName,
  companyName,
  profileComplete,
  initialProposals,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [prompt, setPrompt] = useState("");
  const [preparedFor, setPreparedFor] = useState(
    () => searchParams.get("preparedFor") ?? "",
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [answers, setAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [draftState, setDraftState] = useState<DraftState>({});
  const [serviceColumns, setServiceColumns] = useState<
    Record<string, ServiceColumn[]>
  >({});
  const [showHistory, setShowHistory] = useState(false);
  const [draftProposal, { isLoading: drafting }] = useDraftProposalMutation();
  const [finalizeProposal, { isLoading: finalizing }] =
    useFinalizeProposalMutation();
  const [logoutApi] = useLogoutMutation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const {
    data: proposalsData,
    refetch: refetchProposals,
    isFetching: loadingHistory,
  } = useListProposalsQuery();

  useEffect(() => {
    if (!draftState.questionnaire) return;
    const derived = deriveServiceColumns(draftState.questionnaire);
    setServiceColumns(derived);
    setAnswers(buildEmptyAnswers(draftState.questionnaire, derived));
  }, [draftState.questionnaire]);

  const updateAnswer = (
    questionId: string,
    updater: (current: QuestionnaireAnswer) => QuestionnaireAnswer,
  ) => {
    setAnswers((current) =>
      current.map((answer) =>
        answer.questionId === questionId ? updater(answer) : answer,
      ),
    );
  };

  const addServiceColumn = (questionId: string, label: string) => {
    setServiceColumns((current) => {
      const cols = current[questionId] ?? defaultServiceColumns;
      const id = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const nextCols: ServiceColumn[] = [
        ...cols,
        { id: id || `col-${cols.length + 1}`, label, type: "text" as const },
      ];
      return { ...current, [questionId]: nextCols };
    });
    setAnswers((current) =>
      current.map((answer) => {
        if (answer.questionId !== questionId) return answer;
        const items = (answer.servicesItems ?? []).map((row) => ({
          ...row,
          [label]: row[label] ?? "",
        }));
        return { ...answer, servicesItems: items };
      }),
    );
  };

  const addServiceRow = (questionId: string, cols: ServiceColumn[]) => {
    const columns = cols.length ? cols : defaultServiceColumns;
    updateAnswer(questionId, (current) => ({
      ...current,
      servicesItems: [
        ...(current.servicesItems ?? []),
        Object.fromEntries(columns.map((c) => [c.id, ""])),
      ],
    }));
  };

  const changeServiceCell = (
    questionId: string,
    row: number,
    columnId: string,
    value: string,
  ) => {
    updateAnswer(questionId, (current) => {
      const items = [...(current.servicesItems ?? [])];
      if (!items[row]) items[row] = {};
      items[row] = { ...items[row], [columnId]: value };
      return { ...current, servicesItems: items };
    });
  };

  const submitDraft = async (questionnaireAnswers?: QuestionnaireAnswer[]) => {
    setError("");
    setSuccess("");

    if (!preparedFor.trim()) {
      setError(
        "Please enter who this proposal is prepared for before starting the draft.",
      );
      return;
    }

    if (draftState.questionnaire && questionnaireAnswers) {
      const unanswered = draftState.questionnaire.filter((q) => {
        const ans = questionnaireAnswers.find((a) => a.questionId === q.id);
        if (!ans) return true;
        if (q.type === "textarea") return !ans.value?.trim();
        if (q.type === "radio") return !ans.selectedOptionIds?.length;
        if (q.type === "checkbox") return !ans.selectedOptionIds?.length;
        if (q.type === "services") return !ans.servicesItems?.length;
        if (q.type === "number") return !ans.value?.toString().trim();
        return false;
      });
      if (unanswered.length) {
        setError("Please answer all questions before submitting.");
        return;
      }
    }

    try {
      const result = await draftProposal({
        prompt,
        preparedFor,
        questionnaireAnswers,
        conversationId: draftState.conversationId,
      }).unwrap();

      if (result.status === "needs_more_info") {
        setDraftState({
          conversationId: result.conversationId,
          summary: result.summary,
          questionnaire: result.questionnaire,
        });
        setSuccess(result.summary);
        return;
      }

      setDraftState({
        conversationId: result.conversationId,
        summary: result.summary,
        proposalSpecific: result.proposalSpecific,
      });

      const response = await finalizeProposal({
        conversationId: result.conversationId,
        proposalSpecific: result.proposalSpecific,
        summary: result.summary,
      }).unwrap();

      if (response.success && response.proposal?.pdfUrl) {
        setSuccess("Proposal finalized and PDF ready.");
        setPdfUrl(response.proposal.pdfUrl);
        setShowPdfModal(true);
        await refetchProposals();
      } else {
        setError("Unable to finalize proposal.");
      }
    } catch (err: any) {
      setError(err?.data?.message ?? "Unable to draft proposal.");
    }
  };

  const logout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // ignore
    }
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  };

  const headerInitial = useMemo(
    () => (companyName ? companyName.charAt(0).toUpperCase() : "C"),
    [companyName],
  );

  const updatePreparedFor = (value: string) => {
    setPreparedFor(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("preparedFor", value);
    } else {
      params.delete("preparedFor");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div className="app-shell min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold">
              {headerInitial}
            </div>
            <div>
              <p className="text-sm text-muted">Signed in as {userName}</p>

              <p className="text-base font-semibold">
                {companyName || "Company"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
              onClick={() => setShowHistory((v) => !v)}
            >
              <IconHistory />
              {showHistory ? "Hide history" : "Show history"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <IconUser />
              {userName}
            </button>
            {userMenuOpen ? (
              <div className="absolute right-0 top-12 w-48 rounded-2xl border border-line bg-white shadow-lg">
                <Link
                  href="/company"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-strong"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <IconEdit />
                  Edit profile
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-left hover:bg-surface-strong"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                >
                  <IconLogout />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 grid-cols-1">
          <main className="space-y-4 relative pb-40">
            {draftState.questionnaire?.length ? (
              <QuestionnaireSection
                questionnaire={draftState.questionnaire}
                answers={answers}
                serviceColumns={serviceColumns}
                isPending={isPending}
                onAnswer={updateAnswer}
                onAddColumn={addServiceColumn}
                onAddRow={addServiceRow}
                onChangeServiceCell={changeServiceCell}
                onSubmit={() =>
                  startTransition(() => void submitDraft(answers))
                }
              />
            ) : null}

            {pdfUrl ? (
              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium">Generated PDF</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setShowPdfModal(true)}
                  >
                    View PDF
                  </button>
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
            ) : null}

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}
          </main>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line backdrop-blur">
          <div className="mx-auto flex max-w-7xl px-4 py-3 md:px-6">
            <PromptSection
              preparedFor={preparedFor}
              prompt={prompt}
              isPending={isPending || drafting || finalizing}
              disabled={!profileComplete || !authState.companyProfileComplete}
              onPreparedFor={updatePreparedFor}
              onPrompt={setPrompt}
              onSubmit={() => startTransition(() => void submitDraft())}
            />
          </div>
        </div>
        {showHistory ? (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 py-10">
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <IconHistory />
                  <span className="text-sm font-semibold">
                    Proposal history
                  </span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm hover:bg-surface-strong"
                  onClick={() => setShowHistory(false)}
                >
                  Close
                  <IconX />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-4">
                <HistoryPanel
                  proposals={proposalsData ?? initialProposals}
                  loading={loadingHistory}
                  onRefresh={() => void refetchProposals()}
                />
              </div>
            </div>
          </div>
        ) : null}

        {showPdfModal && pdfUrl ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 md:p-8">
            <div className="relative flex h-[85vh] w-full max-w-6xl flex-col rounded-[28px] border border-line bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="text-base font-semibold">Generated PDF</p>
                  <p className="text-sm text-muted">
                    Review the exported proposal before sharing it.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="button-secondary"
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in new tab
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
                    onClick={() => setShowPdfModal(false)}
                  >
                    Close
                    <IconX />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 p-4">
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  className="h-full w-full rounded-2xl border border-line"
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
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
