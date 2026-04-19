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
import { buildConversationMessage } from "@/app/lib/proposal/conversation";
import ProposalConversation from "@/app/models/ProposalConversation";
import Proposal from "@/app/models/Proposal";

export const runtime = "nodejs";

type FinalizeRequest = {
  proposalId?: string;
  conversationId: string;
  proposalSpecific: unknown;
  summary?: string;
};

export async function POST(request: NextRequest) {
  try {
    const user: any = await requireUserFromRequest(request);
    await dbConnect();

    const companyProfile = await requireCompleteCompanyProfile(user._id.toString());
    const body = (await safeJson(request)) as FinalizeRequest;
    const parsed = finalizeProposalSchema.parse({
      proposalId: body.proposalId,
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

    let proposal = parsed.proposalId
      ? await Proposal.findOne({ _id: parsed.proposalId, userId: user._id })
      : null;

    if (!proposal && conversation.proposalId) {
      proposal = await Proposal.findOne({ _id: conversation.proposalId, userId: user._id });
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

    const nextVersion = proposal ? (proposal.latestVersion || proposal.version || 0) + 1 : 1;
    const key = `proposals/${user._id.toString()}/${Date.now()}-v${nextVersion}-${slugify(parsed.proposalSpecific.title)}.pdf`;
    const pdfUrl = await uploadPdfToS3(key, pdf);
    const summary = parsed.summary ?? conversation.summary ?? "";
    const chatTitle =
      proposal?.chatTitle ||
      conversation.chatTitle ||
      parsed.proposalSpecific.chatTitle ||
      parsed.proposalSpecific.title;

    const versionEntry = {
      version: nextVersion,
      title: parsed.proposalSpecific.title,
      summary,
      pdfUrl,
      s3Key: key,
      proposalSpecific: parsed.proposalSpecific,
      renderPayload,
      createdAt: new Date(),
    };

    if (proposal) {
      proposal.chatTitle = chatTitle;
      proposal.title = parsed.proposalSpecific.title;
      proposal.preparedFor = parsed.proposalSpecific.preparedFor;
      proposal.summary = summary;
      proposal.status = "finalized";
      proposal.proposalSpecific = parsed.proposalSpecific;
      proposal.renderPayload = renderPayload;
      proposal.pdfUrl = pdfUrl;
      proposal.s3Key = key;
      proposal.version = nextVersion;
      proposal.latestVersion = nextVersion;
      proposal.latestPdfUrl = pdfUrl;
      proposal.latestTitle = parsed.proposalSpecific.title;
      proposal.latestSummary = summary;
      proposal.latestProposalSpecific = parsed.proposalSpecific;
      proposal.latestRenderPayload = renderPayload;
      proposal.versions = [...(proposal.versions ?? []), versionEntry];
      await proposal.save();
    } else {
      proposal = await Proposal.create({
        userId: user._id,
        companyProfileId: companyProfile._id,
        conversationId: conversation._id,
        chatTitle,
        title: parsed.proposalSpecific.title,
        preparedFor: parsed.proposalSpecific.preparedFor,
        summary,
        status: "finalized",
        proposalSpecific: parsed.proposalSpecific,
        renderPayload,
        pdfUrl,
        s3Key: key,
        version: nextVersion,
        latestVersion: nextVersion,
        latestPdfUrl: pdfUrl,
        latestTitle: parsed.proposalSpecific.title,
        latestSummary: summary,
        latestProposalSpecific: parsed.proposalSpecific,
        latestRenderPayload: renderPayload,
        versions: [versionEntry],
      });
    }

    conversation.proposalId = proposal._id;
    conversation.chatTitle = chatTitle;
    conversation.status = "ready";
    conversation.summary = summary;
    conversation.questionnaire = [];
    conversation.messages = [
      ...(conversation.messages ?? []),
      buildConversationMessage({
        role: "system",
        content: `Saved version v${nextVersion}: ${parsed.proposalSpecific.title}`,
        version: nextVersion,
        summary,
        pdfUrl,
      }),
    ];
    await conversation.save();

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal._id.toString(),
        chatTitle: proposal.chatTitle,
        preparedFor: proposal.preparedFor,
        latestVersion: proposal.latestVersion,
        latestPdfUrl: proposal.latestPdfUrl,
        latestTitle: proposal.latestTitle,
        latestSummary: proposal.latestSummary,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
