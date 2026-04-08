import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  ProposalDraftResult,
  ProposalHistoryItem,
  ProposalSpecificDraft,
  ProposalThreadDetail,
  QuestionnaireAnswer,
} from "@/app/types/proposal";

type DraftRequest = {
  prompt: string;
  preparedFor?: string;
  questionnaireAnswers?: QuestionnaireAnswer[];
  conversationId?: string;
  proposalId?: string;
};

type FinalizeRequest = {
  proposalId?: string;
  conversationId: string;
  proposalSpecific: ProposalSpecificDraft;
  summary?: string;
};

export const proposalApi = createApi({
  reducerPath: "proposalApi",
  baseQuery: fetchBaseQuery({ baseUrl: "", credentials: "include" }),
  tagTypes: ["Proposals", "ProposalThread"],
  endpoints: (builder) => ({
    listProposals: builder.query<ProposalHistoryItem[], void>({
      query: () => ({ url: "/api/proposals", method: "GET" }),
      transformResponse: (response: { proposals: ProposalHistoryItem[] }) => response.proposals ?? [],
      providesTags: ["Proposals"],
    }),
    draftProposal: builder.mutation<
      ProposalDraftResult & { conversationId: string; proposalId?: string | null },
      DraftRequest
    >({
      query: (body) => ({
        url: "/api/proposals/draft",
        method: "POST",
        body,
      }),
    }),
    finalizeProposal: builder.mutation<
      {
        success: boolean;
        proposal: ProposalHistoryItem;
      },
      FinalizeRequest
    >({
      query: (body) => ({
        url: "/api/proposals/finalize",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Proposals", "ProposalThread"],
    }),
    getProposal: builder.query<ProposalThreadDetail, string>({
      query: (id) => ({ url: `/api/proposals/${id}`, method: "GET" }),
      transformResponse: (response: { proposal: ProposalThreadDetail }) => response.proposal,
      providesTags: (_result, _error, id) => [{ type: "ProposalThread", id }],
    }),
  }),
});

export const {
  useListProposalsQuery,
  useDraftProposalMutation,
  useFinalizeProposalMutation,
  useGetProposalQuery,
  useLazyGetProposalQuery,
} = proposalApi;
