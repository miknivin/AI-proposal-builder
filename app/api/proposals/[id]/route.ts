import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { ApiError } from "@/app/lib/errors";
import { handleRouteError } from "@/app/lib/utils";
import Proposal from "@/app/models/Proposal";

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

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal._id.toString(),
        title: proposal.title,
        preparedFor: proposal.preparedFor,
        summary: proposal.summary,
        pdfUrl: proposal.pdfUrl,
        version: proposal.version,
        proposalSpecific: proposal.proposalSpecific,
        renderPayload: proposal.renderPayload,      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


