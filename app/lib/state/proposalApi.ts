import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type { ProposalDraftResult, ProposalSpecificDraft, QuestionnaireAnswer } from "@/app/types/proposal";

type ProposalListItem = {
  id: string;
  title: string;
  preparedFor: string;
  summary: string;
  pdfUrl: string;
  version: number;
};

type DraftRequest = {
  prompt: string;
  preparedFor?: string;
  questionnaireAnswers?: QuestionnaireAnswer[];
  conversationId?: string;
};

type FinalizeRequest = {
  conversationId: string;
  proposalSpecific: ProposalSpecificDraft;
  summary?: string;
};

export const proposalApi = createApi({
  reducerPath: "proposalApi",
  baseQuery: fetchBaseQuery({ baseUrl: "", credentials: "include" }),
  tagTypes: ["Proposals"],
  endpoints: (builder) => ({
    listProposals: builder.query<ProposalListItem[], void>({
      query: () => ({ url: "/api/proposals", method: "GET" }),
      transformResponse: (response: { proposals: ProposalListItem[] }) => response.proposals ?? [],
      providesTags: ["Proposals"],
    }),
    draftProposal: builder.mutation<
      ProposalDraftResult & { conversationId: string },
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
        proposal: ProposalListItem;
      },
      FinalizeRequest
    >({
      query: (body) => ({
        url: "/api/proposals/finalize",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Proposals"],
    }),
    getProposal: builder.query<any, string>({
      query: (id) => ({ url: `/api/proposals/${id}`, method: "GET" }),
    }),
  }),
});

export const {
  useListProposalsQuery,
  useDraftProposalMutation,
  useFinalizeProposalMutation,
  useGetProposalQuery,
} = proposalApi;
