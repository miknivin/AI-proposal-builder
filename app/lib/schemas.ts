import { z } from "zod";

const wordCount = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const paymentTermSchema = z
  .object({
    label: z.string().trim().optional(),
    paymentTitle: z.string().trim().optional(),
    paymentPercent: z.number().optional(),
    amountLabel: z.string().trim().optional(),
    amount: z.number().optional(),
  })
  .refine((value) => Boolean(value.label || value.paymentTitle), {
    message: "Payment term must include a label or paymentTitle.",
  });

export const apartCardSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2),
  tagline: z.string().trim().min(2),
  about: z.string().trim().min(20),
  passion: z.string().trim().min(20),
  contactIntro: z.string().trim().min(10),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  website: z.string().trim().url().optional().or(z.literal("")),
  addressLines: z.array(z.string().trim().min(2)).min(2),
  logoUrl: z.string().trim().url(),
  coreServices: z.array(z.string().trim().min(2)).min(1),
  defaultPaymentTerms: z.array(paymentTermSchema).min(1),
  accountDetails: z.object({
    accountNo: z.string().trim().optional(),
    name: z.string().trim().optional(),
    ifsc: z.string().trim().optional(),
    bank: z.string().trim().optional(),
    upiId: z.string().trim().optional(),
    qrImage: z.string().trim().url().optional().or(z.literal("")),
  }),
  apartCards: z.array(apartCardSchema).min(3),
});

export const questionnaireAnswerSchema = z.object({
  questionId: z.string().trim().min(1),
  type: z.enum(["radio", "checkbox", "textarea", "services", "number"]),
  value: z.string().optional(),
  selectedOptionIds: z.array(z.string()).optional(),
  customTexts: z.record(z.string(), z.string()).optional(),
  servicesItems: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
});

export const proposalDraftInputSchema = z.object({
  prompt: z.string().trim().min(10),
  preparedFor: z.string().trim().optional(),
  questionnaireAnswers: z.array(questionnaireAnswerSchema).optional(),
  conversationId: z.string().trim().optional(),
  proposalId: z.string().trim().optional(),
});

export const proposalServiceSchema = z.object({
  title: z.string().trim().min(1),
  description: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || wordCount(value) >= 20, {
      message: "Service description must be at least 20 words.",
    })
    .refine((value) => !value || wordCount(value) <= 25, {
      message: "Service description must be at most 25 words.",
    }),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  price: z.number().optional(),
  columnValues: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional(),
});

export const proposalPricingColumnSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(["text", "number", "money"]),
});

export const proposalSpecificSchema = z.object({
  chatTitle: z.string().trim().min(3).optional(),
  title: z.string().trim().min(3),
  preparedFor: z.string().trim().min(2),
  coverTitleLine1: z.string().trim().min(2),
  coverTitleLine2: z.string().trim().min(2),
  aboutText: z
    .string()
    .trim()
    .min(20)
    .refine((value) => wordCount(value) >= 50, {
      message: "About text must be at least 50 words.",
    })
    .refine((value) => wordCount(value) <= 60, {
      message: "About text must be at most 60 words.",
    }),
  passionText: z
    .string()
    .trim()
    .min(20)
    .refine((value) => wordCount(value) >= 60, {
      message: "Passion text must be at least 60 words.",
    })
    .refine((value) => wordCount(value) <= 75, {
      message: "Passion text must be at most 75 words.",
    }),
  expertiseHighlightText: z.string().trim().min(20),
  services: z.array(proposalServiceSchema).min(1),
  pricingColumns: z.array(proposalPricingColumnSchema).optional(),
  paymentTerms: z.array(paymentTermSchema).optional(),
  apartTitle: z.string().trim().min(3).optional(),
  apartCards: z.array(apartCardSchema).min(3).optional(),
  chooseTitle: z.string().trim().min(2).optional(),
  chooseText: z.string().trim().min(20),
  contactText: z.string().trim().min(10),
  serviceTotal: z.number().optional(),
  clarifications: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        answer: z.string().trim().min(1),
      }),
    )
    .default([]),
});

export const finalizeProposalSchema = z.object({
  proposalId: z.string().trim().optional(),
  proposalSpecific: proposalSpecificSchema,
  summary: z.string().trim().optional(),
});

export const renderPayloadSchema = z.object({
  brandName: z.string().trim().min(1),
  title: z.string().trim().min(1),
  preparedFor: z.string().trim().min(1),
  sectionTagline: z.string().trim().min(1),
  coverTitleLine1: z.string().trim().min(1),
  coverTitleLine2: z.string().trim().min(1),
  pageFooterLabel: z.string().trim().min(1),
  aboutTitle: z.string().trim().min(1),
  aboutText: z.string().trim().min(1),
  passionTitle: z.string().trim().min(1),
  passionText: z.string().trim().min(1),
  expertiseTitle: z.string().trim().min(1),
  expertiseSubtitle: z.string().trim().min(1),
  expertiseHighlightTitle: z.string().trim().min(1),
  expertiseHighlightText: z.string().trim().min(1),
  expertiseCards: z.array(apartCardSchema).min(3),
  services: z.array(proposalServiceSchema).min(1),
  pricingColumns: z.array(proposalPricingColumnSchema),
  paymentTerms: z.array(paymentTermSchema),
  accountDetails: z.object({
    accountNo: z.string().optional(),
    name: z.string().optional(),
    ifsc: z.string().optional(),
    bank: z.string().optional(),
    upiId: z.string().optional(),
    qrImage: z.string().optional(),
  }),
  apartTitle: z.string().trim().min(1),
  apartCards: z.array(apartCardSchema).min(3),
  chooseTitle: z.string().trim().min(1),
  chooseText: z.string().trim().min(1),
  contactTitle: z.string().trim().min(1),
  contactText: z.string().trim().min(1),
  contact: z.object({
    company: z.string().trim().min(1),
    addressLines: z.array(z.string().trim().min(1)).min(1),
    phones: z.string().trim().min(1),
    email: z.string().trim().min(1),
  }),
  totals: z.object({
    serviceTotal: z.number(),
  }),
  currencySymbol: z.string().trim().min(1),
  images: z.object({
    logoHorizontal: z.string().trim().url(),
  }),
});



