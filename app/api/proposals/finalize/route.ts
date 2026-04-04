/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { requireCompleteCompanyProfile } from "@/app/lib/company-profile";
import { dbConnect } from "@/app/lib/db/connection";
import { ApiError } from "@/app/lib/errors";
import { finalizeProposalSchema } from "@/app/lib/schemas";
import { handleRouteError, safeJson, slugify } from "@/app/lib/utils";
import { mapToRenderPayload } from "@/app/lib/proposal/mapper";
import { renderProposalHtml } from "@/app/lib/proposal/render";
import { generateProposalPdf } from "@/app/lib/proposal/pdf";
import { uploadPdfToS3 } from "@/app/lib/s3";
import ProposalConversation from "@/app/models/ProposalConversation";
import Proposal from "@/app/models/Proposal";

type FinalizeRequest = {
  conversationId: string;
  proposalSpecific: unknown;
  summary?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user:any = await requireUserFromRequest(request);
    await dbConnect();

    const companyProfile = await requireCompleteCompanyProfile(user._id.toString());
    const body = (await safeJson(request)) as FinalizeRequest;
    const parsed = finalizeProposalSchema.parse({
      proposalSpecific: body.proposalSpecific,
      summary: body.summary,
    });

    const conversation = await ProposalConversation.findOne({
      _id: body.conversationId,
      userId: user._id,
    });

    if (!conversation) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation record not found.");
    }

    const renderPayload = mapToRenderPayload(
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
      parsed.proposalSpecific,
    );

    const html = await renderProposalHtml(renderPayload);
    const pdf = Buffer.from(await generateProposalPdf(html));

    const key = `proposals/${user._id.toString()}/${Date.now()}-${slugify(parsed.proposalSpecific.title)}.pdf`;
    const pdfUrl = await uploadPdfToS3(key, pdf);

    const latestProposal = await Proposal.findOne({ userId: user._id })
      .sort({ version: -1 })
      .lean();

    const proposal = await Proposal.create({
      userId: user._id,
      companyProfileId: companyProfile._id,
      conversationId: conversation._id,
      title: parsed.proposalSpecific.title,
      preparedFor: parsed.proposalSpecific.preparedFor,
      summary: parsed.summary ?? conversation.summary,
      status: "finalized",
      proposalSpecific: parsed.proposalSpecific,
      renderPayload,
      pdfUrl,
      s3Key: key,
      version: (latestProposal?.version ?? 0) + 1,
    });

    conversation.status = "ready";
    conversation.summary = parsed.summary ?? conversation.summary;
    await conversation.save();

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal._id.toString(),
        title: proposal.title,
        preparedFor: proposal.preparedFor,
        pdfUrl: proposal.pdfUrl,
        version: proposal.version,      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


