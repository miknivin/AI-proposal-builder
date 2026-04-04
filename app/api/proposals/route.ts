import { NextRequest, NextResponse } from "next/server";

import { requireUserFromRequest } from "@/app/lib/auth/session";
import { dbConnect } from "@/app/lib/db/connection";
import { handleRouteError } from "@/app/lib/utils";
import Proposal from "@/app/models/Proposal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    await dbConnect();

    const proposals = await Proposal.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      proposals: proposals.map((proposal) => ({
        id: proposal._id.toString(),
        title: proposal.title,
        preparedFor: proposal.preparedFor,
        summary: proposal.summary,
        pdfUrl: proposal.pdfUrl,
        version: proposal.version,      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


