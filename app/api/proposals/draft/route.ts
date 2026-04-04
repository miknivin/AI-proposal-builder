/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { requireCompleteCompanyProfile } from "@/app/lib/company-profile";
import { dbConnect } from "@/app/lib/db/connection";
import { proposalDraftInputSchema } from "@/app/lib/schemas";
import { handleRouteError, safeJson } from "@/app/lib/utils";
import { generateProposalDraft } from "@/app/lib/ai/proposal-draft";
import ProposalConversation from "@/app/models/ProposalConversation";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const companyProfile = await requireCompleteCompanyProfile(user._id.toString());
    const input = proposalDraftInputSchema.parse(await safeJson(request));

    let previousContext: { previousPrompt?: string; previousAnswers?: any[]; summary?: string } | undefined;

    if (input.conversationId) {
      const existing = await ProposalConversation.findOne({
        _id: input.conversationId,
        userId: user._id,
      }).lean();
      if (existing) {
        previousContext = {
          previousPrompt: existing.prompt,
          previousAnswers: existing.questionnaireAnswers,
          summary: existing.summary,
        };
      }
    }

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
      previousContext,
    );

    const conversation = await ProposalConversation.create({
      userId: user._id,
      prompt: input.prompt,
      status: result.status,
      questionnaire: result.status === "needs_more_info" ? result.questionnaire : [],
      questionnaireAnswers: input.questionnaireAnswers ?? [],
      summary: result.summary,
    });

    return NextResponse.json({
      success: true,
      ...result,
      conversationId: conversation._id.toString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}



