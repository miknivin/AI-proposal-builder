export type QuestionType = "radio" | "checkbox" | "textarea" | "services" | "number";

export type QuestionOption = {
  id: string;
  label: string;
  description?: string;
  allowsCustomText?: boolean;
  customTextPlaceholder?: string;
};

export type QuestionnaireItem = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: QuestionOption[];
  servicesTemplate?: {
    columns: Array<{
      id: string;
      label: string;
      type: "text" | "number";
      required?: boolean;
    }>;
    defaults?: Array<Record<string, string | number>>;
  };
};

export type QuestionnaireAnswer = {
  questionId: string;
  type: QuestionType;
  value?: string;
  selectedOptionIds?: string[];
  customTexts?: Record<string, string>;
  servicesItems?: Array<Record<string, string | number>>;
};

export type ProposalPricingColumn = {
  id: string;
  label: string;
  type: "text" | "number" | "money";
};

export type ProposalService = {
  title: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  columnValues?: Record<string, string | number>;
};

export type PaymentTerm = {
  label?: string;
  paymentTitle?: string;
  paymentPercent?: number;
  amountLabel?: string;
  amount?: number;
};

export type AccountDetails = {
  accountNo?: string;
  name?: string;
  ifsc?: string;
  bank?: string;
  upiId?: string;
  qrImage?: string;
};

export type ApartCard = {
  title: string;
  description: string;
};

export type CompanyProfileShape = {
  userId: string;
  name: string;
  tagline: string;
  about: string;
  passion: string;
  contactIntro: string;
  email: string;
  phone: string;
  website?: string;
  addressLines: string[];
  logoUrl: string;
  coreServices: string[];
  defaultPaymentTerms: PaymentTerm[];
  accountDetails: AccountDetails;
  apartCards: ApartCard[];
  isComplete: boolean;
};

export type ProposalSpecificInput = {
  prompt: string;
  preparedFor?: string;
  questionnaireAnswers?: QuestionnaireAnswer[];
  conversationId?: string;
  proposalId?: string;
};

export type ProposalSpecificDraft = {
  chatTitle?: string;
  title: string;
  preparedFor: string;
  coverTitleLine1: string;
  coverTitleLine2: string;
  aboutText: string;
  passionText: string;
  expertiseHighlightText: string;
  services: ProposalService[];
  pricingColumns?: ProposalPricingColumn[];
  paymentTerms?: PaymentTerm[];
  apartTitle?: string;
  apartCards?: ApartCard[];
  chooseTitle?: string;
  chooseText: string;
  contactText: string;
  serviceTotal?: number;
  clarifications: Array<{ question: string; answer: string }>;
};

export type ProposalRenderPayload = {
  brandName: string;
  title: string;
  preparedFor: string;
  sectionTagline: string;
  coverTitleLine1: string;
  coverTitleLine2: string;
  pageFooterLabel: string;
  aboutTitle: string;
  aboutText: string;
  passionTitle: string;
  passionText: string;
  expertiseTitle: string;
  expertiseSubtitle: string;
  expertiseHighlightTitle: string;
  expertiseHighlightText: string;
  expertiseCards: ApartCard[];
  services: ProposalService[];
  pricingColumns: ProposalPricingColumn[];
  paymentTerms: PaymentTerm[];
  accountDetails: AccountDetails;
  apartTitle: string;
  apartCards: ApartCard[];
  chooseTitle: string;
  chooseText: string;
  contactTitle: string;
  contactText: string;
  contact: {
    company: string;
    addressLines: string[];
    phones: string;
    email: string;
  };
  totals: {
    serviceTotal: number;
  };
  currencySymbol: string;
  images: {
    logoHorizontal: string;
  };
};

export type ProposalThreadMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  version?: number;
  summary?: string;
  questionnaire?: QuestionnaireItem[];
  questionnaireAnswers?: QuestionnaireAnswer[];
  pdfUrl?: string;
  createdAt?: string;
};

export type ProposalVersion = {
  version: number;
  title: string;
  summary: string;
  pdfUrl: string;
  s3Key: string;
  proposalSpecific: ProposalSpecificDraft;
  renderPayload: ProposalRenderPayload;
  createdAt?: string;
};

export type ProposalHistoryItem = {
  id: string;
  chatTitle: string;
  preparedFor: string;
  latestVersion: number;
  latestPdfUrl: string;
  latestTitle: string;
  latestSummary: string;
  updatedAt?: string;
};

export type ProposalThreadDetail = {
  id: string;
  chatTitle: string;
  preparedFor: string;
  conversationId: string;
  latestVersion: number;
  latestPdfUrl: string;
  latestTitle: string;
  latestSummary: string;
  latestProposalSpecific: ProposalSpecificDraft;
  versions: ProposalVersion[];
  messages: ProposalThreadMessage[];
};

export type ProposalDraftResult =
  | {
      status: "needs_more_info";
      conversationId?: string;
      chatTitle?: string;
      summary: string;
      questionnaire: QuestionnaireItem[];
    }
  | {
      status: "ready";
      conversationId?: string;
      chatTitle?: string;
      summary: string;
      proposalSpecific: ProposalSpecificDraft;
    };

