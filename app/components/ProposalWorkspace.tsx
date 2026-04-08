/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { HistoryModalBody } from "@/app/components/proposal/HistoryModalBody";
import { PdfPreviewModalBody } from "@/app/components/proposal/PdfPreviewModalBody";
import { PromptSection } from "@/app/components/proposal/PromptSection";
import { QuestionnaireSection } from "@/app/components/proposal/QuestionnaireSection";
import { ThreadViewer } from "@/app/components/proposal/ThreadViewer";
import { WorkspaceHeader } from "@/app/components/proposal/WorkspaceHeader";
import { Modal } from "@/app/components/ui/Modal";
import {
  defaultServiceColumns,
  type ServiceColumn,
} from "@/app/components/proposal/types";
import {
  useDraftProposalMutation,
  useFinalizeProposalMutation,
  useGetProposalQuery,
  useListProposalsQuery,
} from "@/app/lib/state/proposalApi";
import { useLogoutMutation } from "@/app/lib/state/authApi";
import { useAppSelector } from "@/app/lib/state/store";
import type {
  ProposalHistoryItem,
  ProposalSpecificDraft,
  QuestionnaireAnswer,
  QuestionnaireItem,
} from "@/app/types/proposal";

type Props = {
  userName: string;
  companyName: string;
  profileComplete: boolean;
  initialProposals: ProposalHistoryItem[];
  initialProposalId?: string | null;
};

type DraftState = {
  proposalId?: string | null;
  conversationId?: string;
  chatTitle?: string;
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
  initialProposalId = null,
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
  const [activeProposalId, setActiveProposalId] = useState<string | null>(
    initialProposalId,
  );
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [draftProposal, { isLoading: drafting }] = useDraftProposalMutation();
  const [finalizeProposal, { isLoading: finalizing }] =
    useFinalizeProposalMutation();
  const [logoutApi] = useLogoutMutation();
  const {
    data: proposalsData,
    refetch: refetchProposals,
    isFetching: loadingHistory,
  } = useListProposalsQuery();
  const {
    data: activeThread,
    refetch: refetchActiveThread,
    isFetching: loadingThread,
  } = useGetProposalQuery(activeProposalId ?? "", {
    skip: !activeProposalId,
  });

  useEffect(() => {
    if (!draftState.questionnaire) return;
    const derived = deriveServiceColumns(draftState.questionnaire);
    setServiceColumns(derived);
    setAnswers(buildEmptyAnswers(draftState.questionnaire, derived));
  }, [draftState.questionnaire]);

  useEffect(() => {
    setActiveProposalId(initialProposalId);
    setSelectedVersion(null);
    setDraftState({});
    setAnswers([]);
    setPrompt("");
    setError("");
    setSuccess("");
    if (!initialProposalId) {
      setPdfUrl(null);
    }
  }, [initialProposalId]);

  useEffect(() => {
    if (!activeThread) return;
    setDraftState((current) => ({
      ...current,
      proposalId: activeThread.id,
      conversationId: activeThread.conversationId,
      chatTitle: activeThread.chatTitle,
    }));
    setSelectedVersion(activeThread.latestVersion);
    if (activeThread.preparedFor && activeThread.preparedFor !== preparedFor) {
      setPreparedFor(activeThread.preparedFor);
      const params = new URLSearchParams(searchParams.toString());
      params.set("preparedFor", activeThread.preparedFor);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [activeThread, pathname, preparedFor, router, searchParams]);

  useEffect(() => {
    if (!activeThread || selectedVersion === null) return;
    const version =
      activeThread.versions.find((item) => item.version === selectedVersion) ??
      activeThread.versions[activeThread.versions.length - 1];
    setPdfUrl(version?.pdfUrl ?? activeThread.latestPdfUrl ?? null);
  }, [activeThread, selectedVersion]);

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

  const openProposalChat = (proposalId: string) => {
    setShowHistory(false);
    setError("");
    setSuccess("");
    setPrompt("");
    setAnswers([]);
    setDraftState({});
    router.push(`/${proposalId}`);
  };

  const finalizeDraft = async ({
    conversationId,
    proposalSpecific,
    summary,
    proposalId,
    chatTitle,
  }: {
    conversationId: string;
    proposalSpecific: ProposalSpecificDraft;
    summary?: string;
    proposalId?: string | null;
    chatTitle?: string;
  }) => {
    const response = await finalizeProposal({
      proposalId: activeProposalId ?? proposalId ?? undefined,
      conversationId,
      proposalSpecific,
      summary,
    }).unwrap();

    if (!response.success || !response.proposal?.latestPdfUrl) {
      throw new Error("Unable to finalize proposal.");
    }

    setSuccess("Proposal finalized and PDF ready.");
    setActiveProposalId(response.proposal.id);
    setSelectedVersion(response.proposal.latestVersion);
    setPdfUrl(response.proposal.latestPdfUrl);
    setShowPdfModal(true);
    setPrompt("");
    setDraftState((current) => ({
      ...current,
      proposalId: response.proposal.id,
      chatTitle: response.proposal.chatTitle || chatTitle,
      summary,
      questionnaire: undefined,
      proposalSpecific: undefined,
    }));
    await refetchProposals();
    await refetchActiveThread();

    if (!activeProposalId && pathname === "/new") {
      router.replace(`/${response.proposal.id}`);
    }
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
        if (q.type === "services") {
          if (!ans.servicesItems?.length) return true;
          return ans.servicesItems.some((row) => {
            const title = String(
              row.title ?? row.name ?? row.service ?? "",
            ).trim();
            const unitPrice = String(row.unitPrice ?? "").trim();
            return !title || !unitPrice;
          });
        }
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
        proposalId: activeProposalId ?? draftState.proposalId ?? undefined,
      }).unwrap();

      if (result.status === "needs_more_info") {
        setDraftState({
          proposalId: result.proposalId ?? activeProposalId ?? undefined,
          conversationId: result.conversationId,
          chatTitle: result.chatTitle ?? draftState.chatTitle,
          summary: result.summary,
          questionnaire: result.questionnaire,
        });
        setSuccess(result.summary);
        return;
      }

      setDraftState({
        proposalId:
          result.proposalId ?? activeProposalId ?? draftState.proposalId,
        conversationId: result.conversationId,
        chatTitle: result.chatTitle ?? result.proposalSpecific.chatTitle,
        summary: result.summary,
        proposalSpecific: result.proposalSpecific,
      });
      await finalizeDraft({
        proposalId:
          result.proposalId ?? activeProposalId ?? draftState.proposalId,
        conversationId: result.conversationId,
        proposalSpecific: result.proposalSpecific,
        summary: result.summary,
        chatTitle: result.chatTitle ?? result.proposalSpecific.chatTitle,
      });
    } catch (err: any) {
      setError(
        err?.data?.message ?? err?.message ?? "Unable to draft proposal.",
      );
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

  return (
    <div className="app-shell min-h-screen px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <WorkspaceHeader
          userName={userName}
          companyName={companyName}
          showHistory={showHistory}
          onNewChat={() => {
            setShowHistory(false);
            router.push("/new");
          }}
          onToggleHistory={() => setShowHistory((value) => !value)}
          onLogout={logout}
        />

        <div className="grid gap-4 grid-cols-1">
          <main className="space-y-4 relative pb-40">
            {activeThread ? (
              <ThreadViewer
                thread={activeThread}
                selectedVersion={selectedVersion ?? activeThread.latestVersion}
                onSelectVersion={setSelectedVersion}
                onOpenPdf={() => setShowPdfModal(true)}
              />
            ) : loadingThread ? (
              <div className="panel rounded-[28px] p-5 md:p-8 text-sm text-muted">
                Loading proposal chat...
              </div>
            ) : null}

            {draftState.questionnaire?.length ? (
              <QuestionnaireSection
                questionnaire={draftState.questionnaire}
                answers={answers}
                serviceColumns={serviceColumns}
                isPending={isPending || drafting}
                onAnswer={updateAnswer}
                onAddColumn={addServiceColumn}
                onAddRow={addServiceRow}
                onChangeServiceCell={changeServiceCell}
                onSubmit={() =>
                  startTransition(() => void submitDraft(answers))
                }
              />
            ) : null}

            {!activeThread && pdfUrl ? (
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
              forcePromptVisible={Boolean(activeProposalId)}
              onPreparedFor={updatePreparedFor}
              onPrompt={setPrompt}
              onSubmit={() => startTransition(() => void submitDraft())}
            />
          </div>
        </div>
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="Proposal history"
          size="2xl"
          placement="top"
        >
          <HistoryModalBody
            proposals={proposalsData ?? initialProposals}
            loading={loadingHistory}
            onRefresh={() => void refetchProposals()}
            onOpenChat={openProposalChat}
          />
        </Modal>

        <Modal
          isOpen={showPdfModal && Boolean(pdfUrl)}
          onClose={() => setShowPdfModal(false)}
          title="Generated PDF"
          description="Review the exported proposal before sharing it."
          size="6xl"
          contentClassName="flex h-[85vh] flex-col"
          bodyClassName="min-h-[65vh] flex-1"
          actions={
            pdfUrl ? (
              <a
                className="button-secondary"
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in new tab
              </a>
            ) : null
          }
        >
          {pdfUrl ? <PdfPreviewModalBody pdfUrl={pdfUrl} /> : null}
        </Modal>
      </div>
    </div>
  );
}
