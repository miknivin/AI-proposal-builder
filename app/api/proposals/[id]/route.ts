import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { ApiError } from "@/app/lib/errors";
import { handleRouteError } from "@/app/lib/utils";
import { getConversationMessages } from "@/app/lib/proposal/conversation";
import { mapProposalToThreadDetail } from "@/app/lib/proposal/thread";
import Proposal from "@/app/models/Proposal";
import ProposalConversation from "@/app/models/ProposalConversation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proposals/[id]">,
) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const { id } = await context.params;
    const proposal = await Proposal.findOne({ _id: id, userId: user._id }).lean();

    if (!proposal) {
      throw new ApiError(404, "PROPOSAL_NOT_FOUND", "Proposal not found.");
    }

    const conversation = await ProposalConversation.findOne({
      _id: proposal.conversationId,
      userId: user._id,
    }).lean();

    return NextResponse.json({
      success: true,
      proposal: mapProposalToThreadDetail(
        proposal as any,
        getConversationMessages(conversation as any),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
