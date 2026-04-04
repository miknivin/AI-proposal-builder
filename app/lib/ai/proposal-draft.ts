/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";

import type {
  CompanyProfileShape,
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

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const toSentence = (value: string) =>
  normalizeText(value)
    .replace(/\.+$/, "")
    .concat(".");

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

const computeLineTotal = (row: Record<string, string | number>) => {
  const quantity = toNumberOrNull(row.quantity) ?? 1;
  const explicitLineTotal = toNumberOrNull(row.price);

  if (explicitLineTotal !== null) {
    return explicitLineTotal;
  }

  const baseUnitPrice = toNumberOrNull(row.unitPrice) ?? 0;
  const dynamicCharges = Object.entries(row).reduce((sum, [key, value]) => {
    if (["title", "name", "service", "description", "quantity", "unitPrice", "price"].includes(key)) {
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
  prompt,
}: {
  preparedFor: string;
  primaryService: string;
  companyProfile: CompanyProfileShape;
  prompt: string;
}) => {
  const apartStrengths = (companyProfile.apartCards ?? [])
    .map((card) => normalizeText(card.title))
    .filter(Boolean)
    .slice(0, 2)
    .join(" and ");

  const companyStrength = apartStrengths
    ? `${companyProfile.name} brings ${apartStrengths.toLowerCase()} to the work`
    : `${companyProfile.name} brings a steady, thoughtful approach to the work`;

  const promptContext = normalizeText(prompt)
    .replace(/\.$/, "")
    .slice(0, 140);

  return toSentence(
    `${companyStrength}, which makes the proposed ${primaryService.toLowerCase()} scope a practical fit for ${preparedFor}. Based on the request${promptContext ? ` around ${promptContext}` : ""}, the recommendation focuses on clear deliverables, manageable execution, and communication that stays grounded rather than overly promotional. The work can be shaped around practical priorities, realistic timelines, and decisions that support the final outcome without adding unnecessary complexity. That balance is usually where the team can add the most value for a scope like this`,
  );
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
      return customText ? `${option?.label}: ${customText}` : option?.label ?? optionId;
    })
    .join(", ");
};

const defaultPricingColumns: ProposalPricingColumn[] = [
  { id: "price", label: "Price", type: "money" },
];

const derivePricingColumns = (servicesFromAnswers: Array<Record<string, string | number>>) => {
  const dynamicKeys = Array.from(
    new Set(
      servicesFromAnswers.flatMap((row) =>
        Object.keys(row).filter(
          (key) => !["title", "name", "service", "description", "quantity", "unitPrice", "price"].includes(key),
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

const buildFallbackDraft = (
  prompt: string,
  preparedFor: string,
  answers: QuestionnaireAnswer[],
  companyProfile: CompanyProfileShape,
): ProposalSpecificDraft => {
  const servicesFromAnswers =
    answers.find((a) => a.type === "services")?.servicesItems ?? [];

  const selectedServices: ProposalService[] =
    servicesFromAnswers.length > 0
      ? servicesFromAnswers.map((row) => ({
          title: String(row.title ?? row.name ?? row.service ?? companyProfile.coreServices[0] ?? "Service"),
          description: String(row.description ?? ""),
          quantity: Number(row.quantity ?? 1),
          unitPrice: toNumberOrNull(row.unitPrice) ?? toNumberOrNull(row.price) ?? 0,
          price: computeLineTotal(row),
          columnValues: Object.fromEntries(
            Object.entries(row).filter(
              ([key]) =>
                !["title", "name", "service", "description", "quantity", "unitPrice", "price"].includes(key),
            ),
          ),
        }))
      : (companyProfile.coreServices || ["Service"]).map((service, index) => ({
          title: service,
          description: "Scope to be detailed with client.",
          quantity: 1,
          unitPrice: 10000 + index * 5000,
        }));

  const deliverablesAnswer = answers.find((a) => a.questionId === "deliverables");
  const deliverables = toSentence(
    deliverablesAnswer?.value ||
      "The final scope will be refined with the client before kickoff",
  );

  const budgetAnswer = answers.find((a) => a.questionId === "budget_band");
  const budgetSummary =
    budgetAnswer?.value || composeSelectionText(budgetAnswer, []) || "Not provided";
  const serviceSummary =
    composeSelectionText(
      answers.find((a) => a.questionId === "service_scope"),
      [],
    ) || selectedServices.map((s) => s.title).join(", ");
  const primaryService = selectedServices[0]?.title ?? "service work";
  const pricingColumns = derivePricingColumns(servicesFromAnswers);
  const serviceTotal = selectedServices.reduce((sum, service) => sum + Number(service.price ?? 0), 0);
  const apartCards = buildApartCardsFallback({
    companyProfile,
    primaryService,
    preparedFor,
  });

  return {
    title: `${selectedServices[0]?.title ?? "Service"} Proposal`,
    preparedFor,
    coverTitleLine1: "SERVICE",
    coverTitleLine2: "PROPOSAL",
    aboutText: toSentence(companyProfile.about),
    passionText: toSentence(companyProfile.passion),
    expertiseHighlightText: toSentence(
      `${companyProfile.name} recommends ${serviceSummary || "the requested services"} for ${preparedFor}. ${deliverables}`,
    ),
    services: selectedServices,
    pricingColumns,
    paymentTerms: companyProfile.defaultPaymentTerms,
    apartTitle: "Why this approach fits",
    apartCards,
    chooseTitle: `Why ${companyProfile.name}`,
    chooseText: buildChooseTextFallback({
      preparedFor,
      primaryService,
      companyProfile,
      prompt,
    }),
    contactText: toSentence(companyProfile.contactIntro),
    serviceTotal,
    clarifications: [
      { question: "Original prompt", answer: prompt },
      { question: "Selected services", answer: serviceSummary || "Not provided" },
      { question: "Budget guidance", answer: budgetSummary || "Not provided" },
      { question: "Deliverables", answer: deliverables },
    ],
  };
};

export const generateProposalDraft = async (
  input: ProposalSpecificInput,
  companyProfile: CompanyProfileShape,
  context?: { previousPrompt?: string; previousAnswers?: QuestionnaireAnswer[]; summary?: string },
): Promise<ProposalDraftResult> => {
  const preparedFor = input.preparedFor?.trim() || "Client";
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
              "Use this when the prompt or answers are incomplete and you need to ask for all missing details at once. Return a full questionnaire using the schema.",
            parameters: {
              type: "object",
              properties: {
                questionnaire: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      type: {
                        type: "string",
                        enum: ["radio", "checkbox", "textarea", "services", "number"],
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
                                type: { type: "string", enum: ["text", "number"] },
                                required: { type: "boolean" },
                              },
                              required: ["id", "label", "type"],
                            },
                          },
                          defaults: {
                            type: "array",
                            items: { type: "object", additionalProperties: true },
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
              "Return proposal-specific JSON ready to merge with the company profile. Use pricingColumns plus services[].columnValues when the pricing table needs headers like GST, tax, or extra charges. If extra charges exist, keep services[].price as the row-wise line total and make the price column the final Line Total column. Customize apartTitle, apartCards, chooseTitle, and chooseText for the What Sets Us Apart section using the service scope, client context, and company profile. Do not include company profile edits or HTML.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                preparedFor: { type: "string" },
                coverTitleLine1: { type: "string" },
                coverTitleLine2: { type: "string" },
                aboutText: { type: "string" },
                passionText: { type: "string" },
                expertiseHighlightText: { type: "string" },
                services: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
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
                      type: { type: "string", enum: ["text", "number", "money"] },
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
                      amountLabel: { type: "string" },
                      amount: { type: "number" },
                    },
                    required: ["label"],
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
        temperature: 0.3,
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
              previous: context,
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
        const generatedQuestionnaire: QuestionnaireItem[] =
          Array.isArray(args.questionnaire) ? args.questionnaire : [];
        return {
          status: "needs_more_info",
          questionnaire: generatedQuestionnaire,
          summary:
            args.guidance ||
            "A few proposal details are still missing, so the AI prepared a questionnaire. Answer all questions at once.",
        };
      }

      if (fn?.name === "build_proposal_specific") {
        const args = JSON.parse(fn.arguments || "{}");
        const parsed = proposalSpecificSchema.parse(args);
        return {
          status: "ready",
          proposalSpecific: parsed,
          summary:
            "The proposal draft is ready. It uses the collected questionnaire answers and your stored company profile.",
        };
      }
    } catch {
      // Fall back to deterministic builder on any AI or validation error.
    }
  }

  return {
    status: "ready",
    proposalSpecific: buildFallbackDraft(
      input.prompt,
      preparedFor,
      input.questionnaireAnswers ?? [],
      companyProfile,
    ),
    summary:
      "The proposal draft is ready. It uses the collected questionnaire answers and your stored company profile.",
  };
};






