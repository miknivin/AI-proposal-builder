import type { CompanyProfileShape, ProposalRenderPayload, ProposalSpecificDraft } from "@/app/types/proposal";
import { renderPayloadSchema } from "@/app/lib/schemas";
import { sumServiceTotal } from "@/app/lib/utils";

const defaultPricingColumns: ProposalRenderPayload["pricingColumns"] = [
  { id: "price", label: "Price", type: "money" },
];

export const mapToRenderPayload = (
  companyProfile: CompanyProfileShape,
  proposalSpecific: ProposalSpecificDraft,
): ProposalRenderPayload => {
  const payload: ProposalRenderPayload = {
    brandName: companyProfile.name,
    title: proposalSpecific.title,
    preparedFor: proposalSpecific.preparedFor,
    sectionTagline: companyProfile.tagline.toUpperCase(),
    coverTitleLine1: proposalSpecific.coverTitleLine1,
    coverTitleLine2: proposalSpecific.coverTitleLine2,
    pageFooterLabel: `+ ${proposalSpecific.title}`,
    aboutTitle: "ABOUT US",
    aboutText: proposalSpecific.aboutText,
    passionTitle: "OUR PASSION",
    passionText: proposalSpecific.passionText,
    expertiseTitle: "OUR EXPERTISE",
    expertiseSubtitle: "We specialize in a wide range of services, including",
    expertiseHighlightTitle: "FEATURED SERVICE",
    expertiseHighlightText: proposalSpecific.expertiseHighlightText,
    expertiseCards: companyProfile.apartCards,
    services: proposalSpecific.services,
    pricingColumns:
      proposalSpecific.pricingColumns?.length
        ? proposalSpecific.pricingColumns
        : defaultPricingColumns,
    paymentTerms:
      proposalSpecific.paymentTerms?.length
        ? proposalSpecific.paymentTerms
        : companyProfile.defaultPaymentTerms,
    accountDetails: companyProfile.accountDetails,
    apartTitle: proposalSpecific.apartTitle || "What Sets Us Apart",
    apartCards:
      proposalSpecific.apartCards?.length
        ? proposalSpecific.apartCards
        : companyProfile.apartCards,
    chooseTitle: proposalSpecific.chooseTitle || "Why Us",
    chooseText: proposalSpecific.chooseText,
    contactTitle: "Contact Us",
    contactText: proposalSpecific.contactText,
    contact: {
      company: companyProfile.name,
      addressLines: companyProfile.addressLines,
      phones: companyProfile.phone,
      email: companyProfile.email,
    },
    totals: {
      serviceTotal:
        proposalSpecific.serviceTotal ?? sumServiceTotal(proposalSpecific.services),
    },
    currencySymbol: "₹",
    images: {
      logoHorizontal: companyProfile.logoUrl,
    },
  };

  return renderPayloadSchema.parse(payload);
};

