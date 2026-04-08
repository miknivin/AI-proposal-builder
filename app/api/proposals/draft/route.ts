/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { requireCompleteCompanyProfile } from "@/app/lib/company-profile";
import { dbConnect } from "@/app/lib/db/connection";
import { proposalDraftInputSchema } from "@/app/lib/schemas";
import { handleRouteError, safeJson } from "@/app/lib/utils";
import { generateProposalDraft } from "@/app/lib/ai/proposal-draft";
import ProposalConversation from "@/app/models/ProposalConversation";
import Proposal from "@/app/models/Proposal";
import { getConversationMessages, buildConversationMessage } from "@/app/lib/proposal/conversation";
import { getProposalVersions } from "@/app/lib/proposal/thread";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const companyProfile = await requireCompleteCompanyProfile(user._id.toString());
    const input = proposalDraftInputSchema.parse(await safeJson(request));

    let conversation = input.conversationId
      ? await ProposalConversation.findOne({
          _id: input.conversationId,
          userId: user._id,
        })
      : null;

    let proposal = input.proposalId
      ? await Proposal.findOne({
          _id: input.proposalId,
          userId: user._id,
        })
      : null;

    if (!proposal && conversation?.proposalId) {
      proposal = await Proposal.findOne({
        _id: conversation.proposalId,
        userId: user._id,
      });
    }

    const existingMessages = getConversationMessages(conversation);
    const recentMessages = existingMessages.slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
      version: message.version,
      summary: message.summary,
    }));
    const earlierMessageSummaries = existingMessages
      .slice(0, Math.max(0, existingMessages.length - 6))
      .map((message) => message.summary || message.content)
      .filter(Boolean)
      .slice(-6);
    const proposalVersions = proposal ? getProposalVersions(proposal as any) : [];
    const latestVersion = proposalVersions.at(-1);

    const result = await generateProposalDraft(
      input,
      {
        userId: companyProfile.userId.toString(),
        name: companyProfile.name,
        tagline: companyProfile.tagline,
        about: companyProfile.about,
        passion: companyProfile.passion,
        contactIntro: companyProfile.contactIntro,
        email: companyProfile.email,
        phone: companyProfile.phone,
        website: companyProfile.website,
        addressLines: companyProfile.addressLines,
        logoUrl: companyProfile.logoUrl,
        coreServices: companyProfile.coreServices,
        defaultPaymentTerms: companyProfile.defaultPaymentTerms,
        accountDetails: companyProfile.accountDetails,
        apartCards: companyProfile.apartCards,
        isComplete: companyProfile.isComplete,
      },
      {
        chatTitle: proposal?.chatTitle || conversation?.chatTitle || undefined,
        recentMessages,
        earlierMessageSummaries,
        versionSummaries: proposalVersions.slice(0, -1).map((version) => ({
          version: version.version,
          title: version.title,
          summary: version.summary,
        })),
        latestProposalSpecific: latestVersion?.proposalSpecific ?? null,
      },
    );

    const userMessage = buildConversationMessage({
      role: "user",
      content: input.prompt,
      questionnaireAnswers: input.questionnaireAnswers,
    });

    const assistantMessage = buildConversationMessage({
      role: "assistant",
      content: result.summary,
      summary: result.summary,
      questionnaire: result.status === "needs_more_info" ? result.questionnaire : undefined,
      questionnaireAnswers: input.questionnaireAnswers,
    });

    if (conversation) {
      conversation.prompt = input.prompt;
      conversation.status = result.status;
      conversation.questionnaire = result.status === "needs_more_info" ? result.questionnaire : [];
      conversation.questionnaireAnswers = input.questionnaireAnswers ?? [];
      conversation.summary = result.summary;
      conversation.chatTitle = result.chatTitle || conversation.chatTitle || proposal?.chatTitle || "";
      conversation.messages = [
        ...(conversation.messages ?? []),
        userMessage,
        assistantMessage,
      ];
      await conversation.save();
    } else {
      conversation = await ProposalConversation.create({
        userId: user._id,
        proposalId: proposal?._id ?? null,
        chatTitle: result.chatTitle || proposal?.chatTitle || "",
        prompt: input.prompt,
        status: result.status,
        questionnaire: result.status === "needs_more_info" ? result.questionnaire : [],
        questionnaireAnswers: input.questionnaireAnswers ?? [],
        summary: result.summary,
        messages: [userMessage, assistantMessage],
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      conversationId: conversation._id.toString(),
      proposalId: proposal?._id?.toString() ?? conversation.proposalId?.toString() ?? null,
      chatTitle: result.chatTitle || conversation.chatTitle || proposal?.chatTitle || null,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
