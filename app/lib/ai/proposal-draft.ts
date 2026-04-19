/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";

import type {
  CompanyProfileShape,
  PaymentTerm,
  ProposalDraftResult,
  ProposalPricingColumn,
  ProposalService,
  ProposalSpecificDraft,
  ProposalSpecificInput,
  QuestionnaireAnswer,
  QuestionnaireItem,
} from "@/app/types/proposal";
import { env } from "@/app/lib/env";
import { proposalSpecificSchema } from "@/app/lib/schemas";
import { proposalSystemPrompt } from "@/app/lib/ai/prompt";
import {
  ABOUT_TEXT_WORDS,
  PASSION_TEXT_WORDS,
  SERVICE_DESCRIPTION_WORDS,
} from "@/app/lib/proposal/textConstraints";

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const toSentence = (value: string) =>
  normalizeText(value).replace(/\.+$/, "").concat(".");

const countWords = (value: string) =>
  normalizeText(value).split(/\s+/).filter(Boolean).length;

const timelineQuestionId = "timeline_details";

const hasTimelineSignal = (value: string) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  return /(?:timeline|delivery window|duration|deadline|launch date|go[- ]live|go live|turnaround|eta|week|weeks|month|months|day|days|business days|target date|by\s+\d{1,2}[/-]\d{1,2}|by\s+[a-z]+\s+\d{1,2}|q[1-4]\b)/i.test(
    normalized,
  );
};

const answersContainTimeline = (answers: QuestionnaireAnswer[] = []) =>
  answers.some((answer) => {
    if (hasTimelineSignal(answer.value ?? "")) {
      return true;
    }

    if (
      /timeline|delivery|deadline|launch|duration|eta|turnaround/i.test(
        answer.questionId,
      )
    ) {
      return Boolean(
        answer.value?.trim() ||
          answer.selectedOptionIds?.length ||
          Object.values(answer.customTexts ?? {}).some((text) =>
            hasTimelineSignal(text),
          ),
      );
    }

    return Object.values(answer.customTexts ?? {}).some((text) =>
      hasTimelineSignal(text),
    );
  });

const isTimelineMissing = (input: ProposalSpecificInput) =>
  !hasTimelineSignal(input.prompt) &&
  !answersContainTimeline(input.questionnaireAnswers ?? []);

const buildTimelineQuestion = (): QuestionnaireItem => ({
  id: timelineQuestionId,
  label: "What timeline should we plan for this proposal?",
  type: "textarea",
  required: true,
  helpText:
    "Share the expected delivery window, target launch date, deadline, or preferred duration.",
  placeholder:
    "Example: 4 weeks from kickoff, with launch by May 30.",
});

const ensureTimelineQuestion = (questionnaire: QuestionnaireItem[]) => {
  if (
    questionnaire.some((item) =>
      /timeline|delivery|deadline|launch|duration|eta|turnaround/i.test(
        `${item.id} ${item.label} ${item.helpText ?? ""}`,
      ),
    )
  ) {
    return questionnaire;
  }

  return [...questionnaire, buildTimelineQuestion()];
};

const toSlugId = (value: string) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toNumberOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]+/g, "").trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

type DraftContext = {
  chatTitle?: string;
  recentMessages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    version?: number;
    summary?: string;
  }>;
  earlierMessageSummaries?: string[];
  versionSummaries?: Array<{
    version: number;
    title: string;
    summary: string;
  }>;
  latestProposalSpecific?: ProposalSpecificDraft | null;
};

const buildChatTitleFallback = ({
  prompt,
  preparedFor,
  title,
}: {
  prompt: string;
  preparedFor: string;
  title?: string;
}) => {
  if (title?.trim()) {
    return normalizeText(title).replace(/\s+Proposal$/i, "");
  }

  const cleanedPrompt = normalizeText(prompt)
    .replace(/[.,]+$/g, "")
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");

  if (cleanedPrompt) {
    return `${cleanedPrompt} - ${preparedFor}`.slice(0, 60);
  }

  return `Proposal for ${preparedFor}`;
};

const cleanServiceLabel = (value: string) =>
  normalizeText(value)
    .replace(/\s+proposal(\s+for.+)?$/i, "")
    .replace(/\s+for\s+.+$/i, "")
    .trim();

const derivePrimaryServiceLabel = ({
  prompt,
  services,
  title,
}: {
  prompt: string;
  services?: Array<{ title?: string }>;
  title?: string;
}) => {
  const serviceFromRow = services?.find((item) => item.title?.trim())?.title;
  if (serviceFromRow) {
    return cleanServiceLabel(serviceFromRow);
  }

  if (title?.trim()) {
    return cleanServiceLabel(title);
  }

  const promptLabel = normalizeText(prompt)
    .replace(/^create\s+a\s+proposal\s+for\s+/i, "")
    .replace(/^proposal\s+for\s+/i, "")
    .replace(/\s+for\s+[^,]+$/i, "")
    .replace(/[.]+$/g, "")
    .trim();

  return cleanServiceLabel(promptLabel || "Service");
};

const buildProposalTitle = ({
  prompt,
  preparedFor,
  services,
  title,
}: {
  prompt: string;
  preparedFor: string;
  services?: Array<{ title?: string }>;
  title?: string;
}) => {
  const primaryService = derivePrimaryServiceLabel({
    prompt,
    services,
    title,
  });

  return `${primaryService || "Service"} Proposal for ${normalizeText(preparedFor)}`;
};

const extractPromptPricing = (prompt: string) => {
  const normalized = normalizeText(prompt);

  const amountMatches = Array.from(
    normalized.matchAll(
      /(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]{4,})(?:\/-)?/gi,
    ),
  );
  const amounts = amountMatches
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value >= 1000);

  const budget = amounts[0] ?? null;
  const taxMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*%\s*(?:gst|tax)|(?:gst|tax)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/i,
  );
  const taxPercentRaw = Number(taxMatch?.[1] ?? taxMatch?.[2] ?? "");
  const taxPercent = Number.isFinite(taxPercentRaw) ? taxPercentRaw : null;

  return {
    budget,
    taxPercent,
    taxAmount:
      budget !== null && taxPercent !== null
        ? Number(((budget * taxPercent) / 100).toFixed(2))
        : null,
  };
};

const inferRequestedServiceFromPrompt = (prompt: string) => {
  const cleaned = normalizeText(prompt)
    .replace(/^create\s+a\s+proposal\s+for\s+/i, "")
    .replace(/^create\s+proposal\s+for\s+/i, "")
    .replace(/^proposal\s+for\s+/i, "")
    .replace(/\s+(for|at)\s+rs\.?\s*[\d,]+.*$/i, "")
    .replace(/\s+for\s+[\d,]+.*$/i, "")
    .replace(/\s+with\s+(gst|tax)\b.*$/i, "")
    .replace(/\s+including\s+.*$/i, "")
    .replace(/[.]+$/g, "")
    .trim();

  return cleanServiceLabel(cleaned || "Service");
};

const buildExactWordTrimmedText = (value: string, maxWords: number) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  }

  const sentences =
    normalized.match(/[^.!?]+[.!?]?/g)?.map((sentence) => normalizeText(sentence)) ?? [];
  const selected: string[] = [];
  let selectedWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = countWords(sentence);
    if (selectedWordCount + sentenceWordCount > maxWords) {
      break;
    }

    selected.push(sentence);
    selectedWordCount += sentenceWordCount;
  }

  if (selected.length) {
    const combined = selected.join(" ");
    return /[.!?]$/.test(combined) ? combined : `${combined}.`;
  }

  return `${words.slice(0, maxWords).join(" ").replace(/\.+$/, "")}.`;
};

const normalizeWordRangeText = (
  value: string,
  minWords: number,
  maxWords: number,
  fallback: string,
) => {
  const normalized = normalizeText(value);
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length < minWords) {
    return fallback;
  }

  if (words.length > maxWords) {
    return buildExactWordTrimmedText(normalized, maxWords);
  }

  return normalized.replace(/\.+$/, "") + ".";
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripPromptEcho = (value: string, prompt: string) => {
  const normalizedValue = normalizeText(value);
  const normalizedPrompt = normalizeText(prompt);

  if (!normalizedValue || !normalizedPrompt) {
    return normalizedValue;
  }

  const promptWords = normalizedPrompt.split(/\s+/).filter(Boolean);
  if (promptWords.length < 5) {
    return normalizedValue;
  }

  const loosePromptPattern = promptWords.map(escapeRegExp).join("\\s+");
  const replaced = normalizedValue.replace(
    new RegExp(loosePromptPattern, "gi"),
    "the requested scope",
  );

  return normalizeText(replaced);
};

const sanitizeProposalSpecificText = (
  draft: ProposalSpecificDraft,
  prompt: string,
): ProposalSpecificDraft => ({
  ...draft,
  chatTitle: draft.chatTitle ? stripPromptEcho(draft.chatTitle, prompt) : undefined,
  title: stripPromptEcho(draft.title, prompt),
  aboutText: stripPromptEcho(draft.aboutText, prompt),
  passionText: stripPromptEcho(draft.passionText, prompt),
  expertiseHighlightText: stripPromptEcho(draft.expertiseHighlightText, prompt),
  apartTitle: draft.apartTitle ? stripPromptEcho(draft.apartTitle, prompt) : undefined,
  apartCards: draft.apartCards?.map((card) => ({
    ...card,
    title: stripPromptEcho(card.title, prompt),
    description: stripPromptEcho(card.description, prompt),
  })),
  chooseTitle: draft.chooseTitle ? stripPromptEcho(draft.chooseTitle, prompt) : undefined,
  chooseText: stripPromptEcho(draft.chooseText, prompt),
  contactText: stripPromptEcho(draft.contactText, prompt),
  services: draft.services.map((service) => ({
    ...service,
    title: stripPromptEcho(service.title, prompt),
    description: service.description
      ? stripPromptEcho(service.description, prompt)
      : service.description,
  })),
  clarifications: draft.clarifications.map((item) => ({
    question: stripPromptEcho(item.question, prompt),
    answer: stripPromptEcho(item.answer, prompt),
  })),
});

const normalizeServiceDescription = (description: string, title: string) => {
  const base = normalizeText(
    description ||
      `${title} scope tailored to the project goals, required deliverables, implementation flow, and launch readiness for a clear, practical client outcome.`,
  );
  const words = base.split(/\s+/).filter(Boolean);

  if (
    words.length >= SERVICE_DESCRIPTION_WORDS.min &&
    words.length <= SERVICE_DESCRIPTION_WORDS.max
  ) {
    return base.replace(/\.+$/, "") + ".";
  }

  if (words.length > SERVICE_DESCRIPTION_WORDS.max) {
    return buildExactWordTrimmedText(base, SERVICE_DESCRIPTION_WORDS.max);
  }

  let expanded = toSentence(base);
  while (countWords(expanded) < SERVICE_DESCRIPTION_WORDS.min) {
    expanded = `${expanded} ${toSentence(
      "It stays focused on clear deliverables, dependable execution, and launch readiness",
    )}`;
  }

  return buildExactWordTrimmedText(expanded, SERVICE_DESCRIPTION_WORDS.max);
};

const normalizeServiceRows = (services: ProposalService[]) =>
  services.map((service) => ({
    ...service,
    description: normalizeServiceDescription(
      service.description ?? "",
      service.title,
    ),
  }));

const buildDefaultSplitPaymentTerms = (
  serviceTotal?: number,
): PaymentTerm[] => {
  const total = Number(serviceTotal ?? 0);
  const firstHalf = total > 0 ? Number((total / 2).toFixed(2)) : undefined;
  const secondHalf =
    total > 0 ? Number((total - (firstHalf ?? 0)).toFixed(2)) : undefined;

  return [
    {
      label: "50% upfront",
      amountLabel: "50% of total",
      amount: firstHalf,
    },
    {
      label: "50% after launch",
      amountLabel: "50% of total",
      amount: secondHalf,
    },
  ];
};

const extractPaymentTermPercent = (term: PaymentTerm) => {
  const source = `${term.label ?? ""} ${term.amountLabel ?? ""}`;
  const match = source.match(/(\d+(?:\.\d+)?)\s*%/);
  const percent = Number(match?.[1] ?? "");
  return Number.isFinite(percent) ? percent : null;
};

const resolvePaymentTerms = (
  paymentTerms: PaymentTerm[] | undefined,
  serviceTotal?: number,
) => {
  const total = Number(serviceTotal ?? 0);

  if (paymentTerms?.length) {
    const hasExplicitAmounts = paymentTerms.some(
      (term) => typeof term.amount === "number" && Number.isFinite(term.amount),
    );

    if (hasExplicitAmounts || total <= 0) {
      return paymentTerms;
    }

    const computedTerms = paymentTerms.map((term) => {
      const percent = extractPaymentTermPercent(term);
      if (percent === null) {
        return term;
      }

      return {
        ...term,
        amount: Number(((total * percent) / 100).toFixed(2)),
        amountLabel: `${percent}% of total`,
      };
    });

    const fullyComputed = computedTerms.every(
      (term) => typeof term.amount === "number" && Number.isFinite(term.amount),
    );

    return fullyComputed ? computedTerms : buildDefaultSplitPaymentTerms(total);
  }

  return buildDefaultSplitPaymentTerms(total);
};

const normalizeDraftServices = ({
  prompt,
  services,
}: {
  prompt: string;
  services: ProposalService[];
}) => {
  const requestedService = inferRequestedServiceFromPrompt(prompt);
  const promptPricing = extractPromptPricing(prompt);

  if (!requestedService) {
    return services;
  }

  if (services.length <= 1) {
    return normalizeServiceRows(services).map((service) => {
      const existingUnitPrice = Number(service.unitPrice ?? 0);
      const existingPrice = Number(service.price ?? 0);
      const shouldBackfill =
        promptPricing.budget !== null &&
        existingUnitPrice <= 0 &&
        existingPrice <= 0;
      const columnValues = { ...(service.columnValues ?? {}) };

      if (
        shouldBackfill &&
        promptPricing.taxPercent !== null &&
        !Object.keys(columnValues).some((key) => /gst|tax/i.test(key))
      ) {
        columnValues.gst = promptPricing.taxAmount ?? 0;
      }

      return {
        ...service,
        title: requestedService,
        unitPrice: shouldBackfill
          ? (promptPricing.budget ?? 0)
          : service.unitPrice,
        price: shouldBackfill
          ? (promptPricing.budget ?? 0) + (promptPricing.taxAmount ?? 0)
          : service.price,
        columnValues: Object.keys(columnValues).length
          ? columnValues
          : service.columnValues,
      };
    });
  }

  const mergedColumnValues = services.reduce<Record<string, string | number>>(
    (acc, service) => {
      Object.entries(service.columnValues ?? {}).forEach(([key, value]) => {
        if (typeof value === "number") {
          acc[key] =
            (typeof acc[key] === "number" ? Number(acc[key]) : 0) + value;
          return;
        }

        if (!acc[key]) {
          acc[key] = value;
        }
      });

      return acc;
    },
    {},
  );

  const mergedDescription = services
    .map((service) => normalizeText(service.description ?? ""))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(" ");

  const mergedPrice = services.reduce(
    (sum, service) => sum + Number(service.price ?? service.unitPrice ?? 0),
    0,
  );

  const mergedUnitPrice = services.reduce(
    (sum, service) => sum + Number(service.unitPrice ?? 0),
    0,
  );

  return normalizeServiceRows([
    {
      title: requestedService,
      description:
        mergedDescription ||
        `${requestedService} scope based on the client request.`,
      quantity: 1,
      unitPrice: mergedUnitPrice || promptPricing.budget || mergedPrice,
      price:
        mergedPrice ||
        (promptPricing.budget !== null
          ? promptPricing.budget + (promptPricing.taxAmount ?? 0)
          : 0),
      columnValues: Object.keys({
        ...mergedColumnValues,
        ...(promptPricing.taxPercent !== null &&
        !Object.keys(mergedColumnValues).some((key) => /gst|tax/i.test(key))
          ? { gst: promptPricing.taxAmount ?? 0 }
          : {}),
      }).length
        ? {
            ...mergedColumnValues,
            ...(promptPricing.taxPercent !== null &&
            !Object.keys(mergedColumnValues).some((key) => /gst|tax/i.test(key))
              ? { gst: promptPricing.taxAmount ?? 0 }
              : {}),
          }
        : undefined,
    },
  ]);
};

const computeLineTotal = (row: Record<string, string | number>) => {
  const quantity = toNumberOrNull(row.quantity) ?? 1;
  const explicitLineTotal = toNumberOrNull(row.price);

  if (explicitLineTotal !== null) {
    return explicitLineTotal;
  }

  const baseUnitPrice = toNumberOrNull(row.unitPrice) ?? 0;
  const dynamicCharges = Object.entries(row).reduce((sum, [key, value]) => {
    if (
      [
        "title",
        "name",
        "service",
        "description",
        "quantity",
        "unitPrice",
        "price",
      ].includes(key)
    ) {
      return sum;
    }

    return sum + (toNumberOrNull(value) ?? 0);
  }, 0);

  return quantity * baseUnitPrice + dynamicCharges;
};

const buildChooseTextFallback = ({
  preparedFor,
  primaryService,
  companyProfile,
}: {
  preparedFor: string;
  primaryService: string;
  companyProfile: CompanyProfileShape;
}) => {
  const apartStrengths = (companyProfile.apartCards ?? [])
    .map((card) => normalizeText(card.title))
    .filter(Boolean)
    .slice(0, 2)
    .join(" and ");

  const companyStrength = apartStrengths
    ? `${companyProfile.name} brings ${apartStrengths.toLowerCase()} to the work`
    : `${companyProfile.name} brings a steady, thoughtful approach to the work`;

  return toSentence(
    `${companyStrength}, which makes the proposed ${primaryService.toLowerCase()} scope a practical fit for ${preparedFor}. The recommendation focuses on clear deliverables, manageable execution, and communication that stays grounded rather than overly promotional. For a project like this, the real value usually comes from making the work feel organized, practical, and easy to move forward with. That balance helps the proposal stay commercially sensible while still leaving room for thoughtful execution and a polished final result`,
  );
};

const buildAboutTextFallback = ({
  companyProfile,
  primaryService,
  preparedFor,
}: {
  companyProfile: CompanyProfileShape;
  primaryService: string;
  preparedFor: string;
}) => {
  const uspTitles = (companyProfile.apartCards ?? [])
    .map((card) => normalizeText(card.title).toLowerCase())
    .filter(Boolean)
    .slice(0, 2)
    .join(" and ");

  const servicePhrase = normalizeText(primaryService).toLowerCase();
  const base = [
    `${companyProfile.name} is a team-led studio focused on clear strategy, dependable delivery, and practical execution.`,
    uspTitles
      ? `Its edge comes from ${uspTitles}, supported by the perspective already reflected across the company profile.`
      : "Its edge comes from thoughtful collaboration, reliable execution, and a steady focus on practical outcomes.",
    `For ${preparedFor}, that approach will help shape the ${servicePhrase} work into something clear, useful, and aligned with business goals from planning through delivery.`,
  ]
    .map((sentence) => toSentence(sentence))
    .join(" ");

  let combined = base;
  while (countWords(combined) < ABOUT_TEXT_WORDS.min) {
    combined = `${combined} ${toSentence(
      "This keeps the engagement focused, manageable, and commercially relevant throughout the process",
    )}`;
  }

  return buildExactWordTrimmedText(combined, ABOUT_TEXT_WORDS.max);
};

const normalizeAboutText = ({
  value,
  companyProfile,
  primaryService,
  preparedFor,
}: {
  value: string;
  companyProfile: CompanyProfileShape;
  primaryService: string;
  preparedFor: string;
}) => {
  const fallback = buildAboutTextFallback({
    companyProfile,
    primaryService,
    preparedFor,
  });

  const normalized = normalizeWordRangeText(
    value,
    ABOUT_TEXT_WORDS.min,
    ABOUT_TEXT_WORDS.max,
    fallback,
  );
  const firstSentence =
    normalized.match(/[^.!?]+[.!?]?/)?.[0] ?? normalized;
  const firstSentenceLower = normalizeText(firstSentence).toLowerCase();
  const companyNameLower = normalizeText(companyProfile.name).toLowerCase();
  const preparedForLower = normalizeText(preparedFor).toLowerCase();

  const opensWithClientContext =
    firstSentenceLower.startsWith(preparedForLower) ||
    firstSentenceLower.startsWith("this proposal") ||
    firstSentenceLower.startsWith("the client") ||
    firstSentenceLower.startsWith("the project");

  const mentionsCompanyEarly =
    firstSentenceLower.includes(companyNameLower) ||
    /\bteam\b|\bstudio\b|\bagency\b|\bcompany\b/.test(firstSentenceLower);

  if (opensWithClientContext || !mentionsCompanyEarly) {
    return fallback;
  }

  return normalized;
};

const buildApartCardsFallback = ({
  companyProfile,
  primaryService,
  preparedFor,
}: {
  companyProfile: CompanyProfileShape;
  primaryService: string;
  preparedFor: string;
}) =>
  (companyProfile.apartCards ?? []).slice(0, 3).map((card) => ({
    title: card.title,
    description: toSentence(
      `${normalizeText(card.description)} This is especially relevant for ${preparedFor} because the proposed ${primaryService.toLowerCase()} scope needs steady execution and practical decision-making`,
    ),
  }));

const buildPassionTextFallback = (companyProfile: CompanyProfileShape) => {
  const base = normalizeText(companyProfile.passion);
  const serviceList = (companyProfile.coreServices ?? [])
    .slice(0, 3)
    .join(", ");
  const extraSentences = [
    `${companyProfile.name} approaches each engagement with a strong focus on clarity, useful collaboration, and execution that supports real business goals rather than surface-level presentation alone.`,
    serviceList
      ? `That mindset carries through the way the team handles ${serviceList}, making sure strategy, design, and delivery stay connected from the first discussion through launch.`
      : `That mindset carries through the way the team handles strategy, design, and delivery, keeping the work connected from the first discussion through launch.`,
    "The goal is to create work that feels considered, communicates clearly, and remains practical for the client team to manage and grow after handoff.",
  ];

  let combined = [base, ...extraSentences]
    .map((sentence) => toSentence(sentence))
    .join(" ");

  while (countWords(combined) < PASSION_TEXT_WORDS.min) {
    combined = `${combined} ${toSentence(
      "This balance between thoughtful planning and dependable execution is what helps the final output feel both polished and genuinely useful",
    )}`;
  }

  return buildExactWordTrimmedText(combined, PASSION_TEXT_WORDS.max);
};

const composeSelectionText = (
  answer: QuestionnaireAnswer | undefined,
  options: Array<{ id: string; label: string }>,
) => {
  if (!answer?.selectedOptionIds?.length) {
    return "";
  }

  return answer.selectedOptionIds
    .map((optionId) => {
      const option = options.find((item) => item.id === optionId);
      const customText = answer.customTexts?.[optionId]?.trim();
      return customText
        ? `${option?.label}: ${customText}`
        : (option?.label ?? optionId);
    })
    .join(", ");
};

const defaultPricingColumns: ProposalPricingColumn[] = [
  { id: "price", label: "Price", type: "money" },
];

const derivePricingColumns = (
  servicesFromAnswers: Array<Record<string, string | number>>,
) => {
  const dynamicKeys = Array.from(
    new Set(
      servicesFromAnswers.flatMap((row) =>
        Object.keys(row).filter(
          (key) =>
            ![
              "title",
              "name",
              "service",
              "description",
              "quantity",
              "unitPrice",
              "price",
            ].includes(key),
        ),
      ),
    ),
  );

  if (!dynamicKeys.length) {
    return defaultPricingColumns;
  }

  return [
    ...dynamicKeys.map((key) => ({
      id: key,
      label: key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      type: "money" as const,
    })),
    { id: "price", label: "Line Total", type: "money" as const },
  ];
};

const buildServicesFromAnswers = (
  answers: QuestionnaireAnswer[],
  companyProfile: CompanyProfileShape,
  prompt: string,
  fallbackServices?: ProposalService[],
): ProposalService[] => {
  const promptPricing = extractPromptPricing(prompt);
  const servicesFromAnswers =
    answers.find((a) => a.type === "services")?.servicesItems ?? [];

  if (servicesFromAnswers.length > 0) {
    return normalizeServiceRows(
      servicesFromAnswers.map((row) => ({
        title: String(
          row.title ??
            row.name ??
            row.service ??
            companyProfile.coreServices[0] ??
            "Service",
        ),
        description: String(row.description ?? ""),
        quantity: Number(row.quantity ?? 1),
        unitPrice:
          toNumberOrNull(row.unitPrice) ?? toNumberOrNull(row.price) ?? 0,
        price: computeLineTotal(row),
        columnValues: Object.fromEntries(
          Object.entries(row).filter(
            ([key]) =>
              ![
                "title",
                "name",
                "service",
                "description",
                "quantity",
                "unitPrice",
                "price",
              ].includes(key),
          ),
        ),
      })),
    );
  }

  if (fallbackServices?.length) {
    return fallbackServices;
  }

  return normalizeServiceRows([
    {
      title: inferRequestedServiceFromPrompt(prompt),
      description: "Scope to be detailed with client.",
      quantity: 1,
      unitPrice: promptPricing.budget ?? 0,
      price:
        promptPricing.budget !== null
          ? promptPricing.budget + (promptPricing.taxAmount ?? 0)
          : undefined,
      columnValues:
        promptPricing.taxPercent !== null
          ? { gst: promptPricing.taxAmount ?? 0 }
          : undefined,
    },
  ]);
};

const buildFallbackDraft = (
  prompt: string,
  preparedFor: string,
  answers: QuestionnaireAnswer[],
  companyProfile: CompanyProfileShape,
  context?: DraftContext,
): ProposalSpecificDraft => {
  const latestProposal = context?.latestProposalSpecific ?? null;
  const promptPricing = extractPromptPricing(prompt);
  const selectedServices = normalizeDraftServices({
    prompt,
    services: buildServicesFromAnswers(
      answers,
      companyProfile,
      prompt,
      latestProposal?.services,
    ),
  });
  const servicesFromAnswers =
    answers.find((a) => a.type === "services")?.servicesItems ?? [];
  const deliverablesAnswer = answers.find(
    (a) => a.questionId === "deliverables",
  );
  const deliverables = toSentence(
    deliverablesAnswer?.value ||
      "The final scope will be refined with the client before kickoff",
  );

  const budgetAnswer = answers.find((a) => a.questionId === "budget_band");
  const budgetSummary =
    budgetAnswer?.value ||
    composeSelectionText(budgetAnswer, []) ||
    "Not provided";
  const serviceSummary =
    composeSelectionText(
      answers.find((a) => a.questionId === "service_scope"),
      [],
    ) || selectedServices.map((s) => s.title).join(", ");
  const primaryService =
    selectedServices[0]?.title ?? latestProposal?.title ?? "service work";
  const aboutTextFallback = buildAboutTextFallback({
    companyProfile,
    primaryService,
    preparedFor,
  });
  const pricingColumns = servicesFromAnswers.length
    ? derivePricingColumns(servicesFromAnswers)
    : latestProposal?.pricingColumns?.length
      ? latestProposal.pricingColumns
      : promptPricing.taxPercent !== null
        ? [
            { id: "gst", label: "GST", type: "money" as const },
            { id: "price", label: "Line Total", type: "money" as const },
          ]
        : defaultPricingColumns;
  const serviceTotal = selectedServices.reduce(
    (sum, service) => sum + Number(service.price ?? service.unitPrice ?? 0),
    0,
  );
  const apartCards = latestProposal?.apartCards?.length
    ? latestProposal.apartCards
    : buildApartCardsFallback({
        companyProfile,
        primaryService,
        preparedFor,
      });

  if (latestProposal) {
    return {
      ...latestProposal,
      chatTitle:
        latestProposal.chatTitle ||
        context?.chatTitle ||
        buildChatTitleFallback({
          prompt,
          preparedFor,
          title: latestProposal.title,
        }),
      title: buildProposalTitle({
        prompt,
        preparedFor,
        services: selectedServices,
        title: latestProposal.title,
      }),
      preparedFor: latestProposal.preparedFor || preparedFor,
      aboutText: normalizeAboutText({
        value: latestProposal.aboutText || "",
        companyProfile,
        primaryService,
        preparedFor,
      }),
      services: selectedServices,
      pricingColumns,
      paymentTerms: resolvePaymentTerms(
        latestProposal.paymentTerms,
        serviceTotal,
      ),
      apartTitle: latestProposal.apartTitle || "Why this approach fits",
      apartCards,
      chooseTitle: latestProposal.chooseTitle || `Why ${companyProfile.name}`,
      chooseText:
        latestProposal.chooseText ||
        buildChooseTextFallback({
          preparedFor,
          primaryService,
          companyProfile,
        }),
      contactText:
        latestProposal.contactText || toSentence(companyProfile.contactIntro),
      serviceTotal,
      clarifications: [
        ...(latestProposal.clarifications ?? []),
        {
          question: "Edit request",
          answer: `Refine the proposal for ${preparedFor} around ${primaryService.toLowerCase()} while preserving the established structure where appropriate.`,
        },
      ],
    };
  }

  return {
    chatTitle:
      context?.chatTitle ||
      buildChatTitleFallback({ prompt, preparedFor, title: primaryService }),
    title: buildProposalTitle({
      prompt,
      preparedFor,
      services: selectedServices,
      title: selectedServices[0]?.title ?? primaryService,
    }),
    preparedFor,
    coverTitleLine1: "SERVICE",
    coverTitleLine2: "PROPOSAL",
    aboutText: aboutTextFallback,
    passionText: buildPassionTextFallback(companyProfile),
    expertiseHighlightText: toSentence(
      `${companyProfile.name} recommends ${serviceSummary || "the requested services"} for ${preparedFor}. ${deliverables}`,
    ),
    services: selectedServices,
    pricingColumns,
    paymentTerms: resolvePaymentTerms(undefined, serviceTotal),
    apartTitle: "Why this approach fits",
    apartCards,
    chooseTitle: `Why ${companyProfile.name}`,
    chooseText: buildChooseTextFallback({
      preparedFor,
      primaryService,
      companyProfile,
    }),
    contactText: toSentence(companyProfile.contactIntro),
    serviceTotal,
    clarifications: [
      {
        question: "Project brief",
        answer: `Proposal requested for ${preparedFor} covering ${serviceSummary || primaryService}.`,
      },
      {
        question: "Selected services",
        answer: serviceSummary || "Not provided",
      },
      { question: "Budget guidance", answer: budgetSummary || "Not provided" },
      { question: "Deliverables", answer: deliverables },
    ],
  };
};

export const generateProposalDraft = async (
  input: ProposalSpecificInput,
  companyProfile: CompanyProfileShape,
  context?: DraftContext,
): Promise<ProposalDraftResult> => {
  const preparedFor =
    input.preparedFor?.trim() ||
    context?.latestProposalSpecific?.preparedFor ||
    "Client";
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    try {
      const client = new OpenAI({
        apiKey: gatewayKey,
        baseURL: env.aiGatewayBaseUrl,
      });

      const tools = [
        {
          type: "function" as const,
          function: {
            name: "request_questionnaire",
            description:
              "Use this when the prompt or answers are incomplete and you need to ask for all missing details at once. Return a full questionnaire using the schema. If the service scope is unclear, include a services-type question so the UI can open the service line editor. If an individual service price is unclear, ask a number-type question for that price. If the preparedFor company or its business context is unclear, include one textarea question asking for a short company/business overview. If the prompt or answers do not mention any timeline, delivery window, duration, deadline, or launch date, include a direct timeline question. If a timeline is mentioned but still vague, ask a follow-up instead of assuming it. If pricing is uncertain, include dedicated questionnaire items for it. Prefer radio questions with common preset options, and make the final option a custom-input choice by setting allowsCustomText to true.",
            parameters: {
              type: "object",
              properties: {
                chatTitle: {
                  type: "string",
                  description:
                    "Optional proposal thread title. If an existing chatTitle is provided in context, keep it unchanged.",
                },
                questionnaire: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      paymentTitle: {
                        type: "string",
                        description:
                          "Display title for the payment term, for example 50% upfront or 30% on design approval.",
                      },
                      paymentPercent: {
                        type: "number",
                        description:
                          "Numeric percentage used to calculate the payment amount from the total, for example 50.",
                      },
                      type: {
                        type: "string",
                        enum: [
                          "radio",
                          "checkbox",
                          "textarea",
                          "services",
                          "number",
                        ],
                      },
                      required: { type: "boolean" },
                      helpText: { type: "string" },
                      placeholder: { type: "string" },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                      paymentTitle: {
                        type: "string",
                        description:
                          "Display title for the payment term, for example 50% upfront or 30% on design approval.",
                      },
                      paymentPercent: {
                        type: "number",
                        description:
                          "Numeric percentage used to calculate the payment amount from the total, for example 50.",
                      },
                            description: { type: "string" },
                            allowsCustomText: { type: "boolean" },
                            customTextPlaceholder: { type: "string" },
                          },
                          required: ["id", "label"],
                        },
                      },
                      servicesTemplate: {
                        type: "object",
                        properties: {
                          columns: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                label: { type: "string" },
                      paymentTitle: {
                        type: "string",
                        description:
                          "Display title for the payment term, for example 50% upfront or 30% on design approval.",
                      },
                      paymentPercent: {
                        type: "number",
                        description:
                          "Numeric percentage used to calculate the payment amount from the total, for example 50.",
                      },
                                type: {
                                  type: "string",
                                  enum: ["text", "number"],
                                },
                                required: { type: "boolean" },
                              },
                              required: ["id", "label", "type"],
                            },
                          },
                          defaults: {
                            type: "array",
                            items: {
                              type: "object",
                              additionalProperties: true,
                            },
                          },
                        },
                        required: ["columns"],
                      },
                    },
                    required: ["id", "label", "type", "required"],
                  },
                },
                guidance: { type: "string" },
              },
              required: ["questionnaire"],
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "build_proposal_specific",
            description:
              "Return proposal-specific JSON ready to merge with the company profile. Use pricingColumns plus services[].columnValues when the pricing table needs headers like GST, tax, or extra charges. If extra charges exist, keep services[].price as the row-wise line total and make the price column the final Line Total column. Payment terms should preferably use paymentTitle and paymentPercent so the amount can be computed from the total. Customize apartTitle, apartCards, chooseTitle, and chooseText for the What Sets Us Apart section using the service scope, client context, and company profile. If latest saved proposal context is provided, preserve the existing proposal structure where the user has not asked for changes. Do not include company profile edits or HTML.",
            parameters: {
              type: "object",
              properties: {
                chatTitle: {
                  type: "string",
                  description:
                    "Short human-readable thread title. If an existing chatTitle is provided in context, keep it stable unless there is a clear reason to rename it.",
                },
                title: { type: "string" },
                preparedFor: { type: "string" },
                coverTitleLine1: { type: "string" },
                coverTitleLine2: { type: "string" },
                aboutText: {
                  type: "string",
                  description:
                    `Compact About Us copy for the template. It should usually land between ${ABOUT_TEXT_WORDS.preferredMin} and ${ABOUT_TEXT_WORDS.preferredMax} words, and it may go up to ${ABOUT_TEXT_WORDS.max} words when needed to finish naturally. The first 2 to 3 sentences must be about the company, its team perspective, and a real differentiator from the saved profile. The closing sentence should explain how the proposed service will help the client.`,
                },
                passionText: {
                  type: "string",
                  description:
                    `Passion block copy for the template. It must be between ${PASSION_TEXT_WORDS.min} and ${PASSION_TEXT_WORDS.max} words and should read naturally.`,
                },
                expertiseHighlightText: { type: "string" },
                services: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: {
                        type: "string",
                        description: `Usually ${SERVICE_DESCRIPTION_WORDS.preferredMin} to ${SERVICE_DESCRIPTION_WORDS.preferredMax} words, and up to ${SERVICE_DESCRIPTION_WORDS.max} words when needed to complete the thought naturally.`,
                      },
                      quantity: { type: "number" },
                      unitPrice: { type: "number" },
                      price: { type: "number" },
                      columnValues: {
                        type: "object",
                        additionalProperties: {
                          anyOf: [{ type: "string" }, { type: "number" }],
                        },
                        description:
                          "Dynamic per-row values such as gst, tax, extraCharge, setupFee, amc, or basePrice. If these are used, services[].price should hold the final line total for that row.",
                      },
                    },
                    required: ["title"],
                  },
                },
                pricingColumns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      paymentTitle: {
                        type: "string",
                        description:
                          "Display title for the payment term, for example 50% upfront or 30% on design approval.",
                      },
                      paymentPercent: {
                        type: "number",
                        description:
                          "Numeric percentage used to calculate the payment amount from the total, for example 50.",
                      },
                      type: {
                        type: "string",
                        enum: ["text", "number", "money"],
                      },
                    },
                    required: ["id", "label", "type"],
                  },
                  description:
                    "Ordered table headers for the pricing table. When extra charges exist, include the price column last and label it as Line Total.",
                },
                paymentTerms: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      paymentTitle: {
                        type: "string",
                        description:
                          "Display title for the payment term, for example 50% upfront or 30% on design approval.",
                      },
                      paymentPercent: {
                        type: "number",
                        description:
                          "Numeric percentage used to calculate the payment amount from the total, for example 50.",
                      },
                      amountLabel: { type: "string" },
                      amount: { type: "number" },
                    },
                    required: [],
                  },
                },
                apartTitle: {
                  type: "string",
                  description:
                    "Section title for the what sets us apart area. Keep it grounded and relevant to the proposal context.",
                },
                apartCards: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                  },
                  description:
                    "Three concise cards explaining why the company is a fit for this particular scope. Base them on the company profile and the requested services, not generic sales language.",
                },
                chooseTitle: {
                  type: "string",
                  description:
                    "Short heading above chooseText. Keep it natural and specific to the proposal.",
                },
                chooseText: {
                  type: "string",
                  description:
                    "A natural, human explanation of why this company is a good fit for this client and service scope. Use company profile strengths plus clues from the prompt and preparedFor context. Keep it calm and not overly salesy. Make it slightly elaborative, usually 3-5 sentences.",
                },
                contactText: { type: "string" },
                serviceTotal: {
                  type: "number",
                  description:
                    "Overall proposal total. When multiple pricing columns exist, this should be the sum of the row-wise line totals.",
                },
                clarifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                  },
                },
              },
              required: [
                "chatTitle",
                "title",
                "preparedFor",
                "coverTitleLine1",
                "coverTitleLine2",
                "aboutText",
                "passionText",
                "expertiseHighlightText",
                "services",
                "pricingColumns",
                "apartTitle",
                "apartCards",
                "chooseTitle",
                "chooseText",
                "contactText",
              ],
            },
          },
        },
      ];

      const completion = await client.chat.completions.create({
        model: env.aiGatewayModel,
        temperature: 0.45,
        messages: [
          { role: "system", content: proposalSystemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              prompt: input.prompt,
              preparedFor,
              companyProfile: {
                name: companyProfile.name,
                tagline: companyProfile.tagline,
                about: companyProfile.about,
                passion: companyProfile.passion,
                contactIntro: companyProfile.contactIntro,
                coreServices: companyProfile.coreServices,
                apartCards: companyProfile.apartCards.map((card) => ({
                  id: toSlugId(card.title),
                  title: card.title,
                  description: card.description,
                })),
                defaultPaymentTerms: companyProfile.defaultPaymentTerms,
              },
              answers: input.questionnaireAnswers ?? [],
              threadContext: context,
            }),
          },
        ],
        tools,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const toolCall = choice.message?.tool_calls?.[0];
      const isFunctionCall = toolCall && (toolCall as any).type === "function";
      const fn = isFunctionCall ? (toolCall as any).function : undefined;

      if (fn?.name === "request_questionnaire") {
        const args = JSON.parse(fn.arguments || "{}");
        const generatedQuestionnaire: QuestionnaireItem[] = Array.isArray(
          args.questionnaire,
        )
          ? args.questionnaire
          : [];
        const questionnaire = isTimelineMissing(input)
          ? ensureTimelineQuestion(generatedQuestionnaire)
          : generatedQuestionnaire;
        return {
          status: "needs_more_info",
          chatTitle: args.chatTitle || context?.chatTitle,
          questionnaire,
          summary:
            args.guidance ||
            "A few proposal details are still missing, so the AI prepared a questionnaire. Answer all questions at once.",
        };
      }

      if (fn?.name === "build_proposal_specific") {
        const args = JSON.parse(fn.arguments || "{}");
        const promptPricing = extractPromptPricing(input.prompt);
        const parsed = proposalSpecificSchema.parse({
          ...args,
          services: normalizeServiceRows(
            Array.isArray(args.services) ? args.services : [],
          ),
          aboutText: normalizeAboutText({
            value: String(args.aboutText ?? ""),
            companyProfile,
            primaryService:
              Array.isArray(args.services) && args.services[0]?.title
                ? String(args.services[0].title)
                : inferRequestedServiceFromPrompt(input.prompt),
            preparedFor,
          }),
          passionText: buildExactWordTrimmedText(
            String(args.passionText ?? ""),
            PASSION_TEXT_WORDS.max,
          ),
        });
        const normalizedServices = normalizeDraftServices({
          prompt: input.prompt,
          services: parsed.services,
        });
        const normalizedPricingColumns = parsed.pricingColumns?.length
          ? parsed.pricingColumns
          : promptPricing.taxPercent !== null
            ? [
                { id: "gst", label: "GST", type: "money" as const },
                { id: "price", label: "Line Total", type: "money" as const },
              ]
            : defaultPricingColumns;
        return {
          ...(isTimelineMissing(input)
            ? {
                status: "needs_more_info" as const,
                chatTitle: parsed.chatTitle || context?.chatTitle,
                questionnaire: [buildTimelineQuestion()],
                summary:
                  "The scope and pricing are clear, but the timeline is still missing. Please share the expected timeline so the proposal can be completed.",
              }
            : {
                status: "ready" as const,
                chatTitle: parsed.chatTitle || context?.chatTitle,
                proposalSpecific: sanitizeProposalSpecificText(
                  {
                    ...parsed,
                    passionText: buildExactWordTrimmedText(
                      parsed.passionText,
                      PASSION_TEXT_WORDS.max,
                    ),
                    services: normalizedServices,
                    pricingColumns: normalizedPricingColumns,
                    paymentTerms: resolvePaymentTerms(
                      parsed.paymentTerms,
                      normalizedServices.reduce(
                        (sum, service) =>
                          sum + Number(service.price ?? service.unitPrice ?? 0),
                        0,
                      ),
                    ),
                    serviceTotal: normalizedServices.reduce(
                      (sum, service) =>
                        sum + Number(service.price ?? service.unitPrice ?? 0),
                      0,
                    ),
                  },
                  input.prompt,
                ),
                summary: "",
              }),
        };
      }
    } catch {
      // Fall back to deterministic builder on any AI or validation error.
    }
  }

  const fallbackDraft = buildFallbackDraft(
    input.prompt,
    preparedFor,
    input.questionnaireAnswers ?? [],
    companyProfile,
    context,
  );

  if (isTimelineMissing(input)) {
    return {
      status: "needs_more_info",
      chatTitle: fallbackDraft.chatTitle,
      questionnaire: [buildTimelineQuestion()],
      summary:
        "The timeline is still missing. Please share the expected timeline so the proposal can be completed.",
    };
  }

  return {
    status: "ready",
    chatTitle: fallbackDraft.chatTitle,
    proposalSpecific: sanitizeProposalSpecificText(fallbackDraft, input.prompt),
    summary: "",
  };
};


