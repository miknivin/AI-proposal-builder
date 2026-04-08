import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { handleRouteError } from "@/app/lib/utils";
import { mapProposalToHistoryItem } from "@/app/lib/proposal/thread";
import Proposal from "@/app/models/Proposal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const proposals = await Proposal.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      proposals: proposals.map((proposal) => mapProposalToHistoryItem(proposal as any)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
