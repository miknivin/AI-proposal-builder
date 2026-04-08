import type {
  ProposalThreadMessage,
  QuestionnaireAnswer,
  QuestionnaireItem,
} from "@/app/types/proposal";

type ConversationLike = {
  prompt?: string;
  summary?: string;
  status?: string;
  questionnaire?: unknown[];
  questionnaireAnswers?: unknown[];
  createdAt?: Date | string;
  messages?: Array<{
    role?: "user" | "assistant" | "system";
    content?: string;
    version?: number;
    summary?: string;
    questionnaire?: unknown[];
    questionnaireAnswers?: unknown[];
    pdfUrl?: string;
    createdAt?: Date | string;
  }>;
};

const toIsoString = (value?: Date | string) => {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

const fallbackContentByRole = (
  role: "user" | "assistant" | "system",
  summary?: string,
) => {
  if (summary?.trim()) {
    return summary.trim();
  }

  if (role === "user") {
    return "User message";
  }

  if (role === "system") {
    return "Proposal version updated.";
  }

  return "Proposal draft updated.";
};

export const buildConversationMessage = (
  message: Omit<ProposalThreadMessage, "createdAt">,
) => ({
  ...message,
  content:
    message.content?.trim() ||
    fallbackContentByRole(message.role, message.summary),
  createdAt: new Date(),
});

export const getConversationMessages = (
  conversation?: ConversationLike | null,
): ProposalThreadMessage[] => {
  if (!conversation) {
    return [];
  }

  if (conversation.messages?.length) {
    return conversation.messages.map((message) => ({
      role: message.role ?? "assistant",
      content:
        message.content?.trim() ||
        fallbackContentByRole(message.role ?? "assistant", message.summary),
      version: message.version,
      summary: message.summary,
      questionnaire: (message.questionnaire as QuestionnaireItem[] | undefined) ?? undefined,
      questionnaireAnswers:
        (message.questionnaireAnswers as QuestionnaireAnswer[] | undefined) ?? undefined,
      pdfUrl: message.pdfUrl,
      createdAt: toIsoString(message.createdAt),
    }));
  }

  const fallback: ProposalThreadMessage[] = [];

  if (conversation.prompt) {
    fallback.push({
      role: "user",
      content: conversation.prompt,
      createdAt: toIsoString(conversation.createdAt),
    });
  }

  if (conversation.summary || conversation.questionnaire?.length) {
    fallback.push({
      role: "assistant",
      content: conversation.summary || "Proposal draft updated.",
      summary: conversation.summary,
      questionnaire: (conversation.questionnaire as QuestionnaireItem[] | undefined) ?? undefined,
      questionnaireAnswers:
        (conversation.questionnaireAnswers as QuestionnaireAnswer[] | undefined) ?? undefined,
      createdAt: toIsoString(conversation.createdAt),
    });
  }

  return fallback;
};
