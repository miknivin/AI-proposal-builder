import type {
  ProposalHistoryItem,
  ProposalRenderPayload,
  ProposalSpecificDraft,
  ProposalThreadDetail,
  ProposalThreadMessage,
  ProposalVersion,
} from "@/app/types/proposal";

type ProposalLike = {
  _id: { toString(): string };
  chatTitle?: string;
  preparedFor?: string;
  latestVersion?: number;
  latestPdfUrl?: string;
  latestTitle?: string;
  latestSummary?: string;
  latestProposalSpecific?: ProposalSpecificDraft;
  latestRenderPayload?: ProposalRenderPayload;
  conversationId?: { toString(): string };
  versions?: Array<{
    version?: number;
    title?: string;
    summary?: string;
    pdfUrl?: string;
    s3Key?: string;
    proposalSpecific?: ProposalSpecificDraft;
    renderPayload?: ProposalRenderPayload;
    createdAt?: Date | string;
  }>;
  title?: string;
  summary?: string;
  pdfUrl?: string;
  s3Key?: string;
  version?: number;
  proposalSpecific?: ProposalSpecificDraft;
  renderPayload?: ProposalRenderPayload;
  updatedAt?: Date | string;
};

const toIsoString = (value?: Date | string) => {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

export const getProposalVersions = (proposal: ProposalLike): ProposalVersion[] => {
  if (proposal.versions?.length) {
    return proposal.versions
      .map((item) => ({
        version: item.version ?? 1,
        title: item.title ?? proposal.title ?? "Proposal",
        summary: item.summary ?? proposal.summary ?? "",
        pdfUrl: item.pdfUrl ?? proposal.pdfUrl ?? "",
        s3Key: item.s3Key ?? proposal.s3Key ?? "",
        proposalSpecific: item.proposalSpecific ?? proposal.proposalSpecific ?? ({} as ProposalSpecificDraft),
        renderPayload: item.renderPayload ?? proposal.renderPayload ?? ({} as ProposalRenderPayload),
        createdAt: toIsoString(item.createdAt),
      }))
      .sort((a, b) => a.version - b.version);
  }

  return [
    {
      version: proposal.version ?? 1,
      title: proposal.title ?? "Proposal",
      summary: proposal.summary ?? "",
      pdfUrl: proposal.pdfUrl ?? "",
      s3Key: proposal.s3Key ?? "",
      proposalSpecific: proposal.proposalSpecific ?? ({} as ProposalSpecificDraft),
      renderPayload: proposal.renderPayload ?? ({} as ProposalRenderPayload),
      createdAt: undefined,
    },
  ];
};

export const getLatestProposalVersion = (proposal: ProposalLike) => {
  const versions = getProposalVersions(proposal);
  return versions[versions.length - 1];
};

export const mapProposalToHistoryItem = (proposal: ProposalLike): ProposalHistoryItem => {
  const latest = getLatestProposalVersion(proposal);

  return {
    id: proposal._id.toString(),
    chatTitle: proposal.chatTitle ?? latest.title,
    preparedFor: proposal.preparedFor ?? latest.proposalSpecific?.preparedFor ?? "",
    latestVersion: proposal.latestVersion ?? latest.version,
    latestPdfUrl: proposal.latestPdfUrl ?? latest.pdfUrl,
    latestTitle: proposal.latestTitle ?? latest.title,
    latestSummary: proposal.latestSummary ?? latest.summary,
    updatedAt: toIsoString(proposal.updatedAt),
  };
};

export const mapProposalToThreadDetail = (
  proposal: ProposalLike,
  messages: ProposalThreadMessage[],
): ProposalThreadDetail => {
  const versions = getProposalVersions(proposal);
  const latest = getLatestProposalVersion(proposal);

  return {
    id: proposal._id.toString(),
    chatTitle: proposal.chatTitle ?? latest.title,
    preparedFor: proposal.preparedFor ?? latest.proposalSpecific?.preparedFor ?? "",
    conversationId: proposal.conversationId?.toString() ?? "",
    latestVersion: proposal.latestVersion ?? latest.version,
    latestPdfUrl: proposal.latestPdfUrl ?? latest.pdfUrl,
    latestTitle: proposal.latestTitle ?? latest.title,
    latestSummary: proposal.latestSummary ?? latest.summary,
    latestProposalSpecific: proposal.latestProposalSpecific ?? latest.proposalSpecific,
    versions,
    messages,
  };
};

