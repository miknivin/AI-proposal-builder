import ejs from "ejs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProposalRenderPayload } from "@/app/types/proposal";

const proposalTemplatePath = path.join(process.cwd(), "proposal.ejs");
const coverPagePath = path.join(
  process.cwd(),
  "public",
  "assets",
  "imgs",
  "coverpage.webp",
);

export const renderProposalHtml = async (payload: ProposalRenderPayload) => {
  const coverPageBackground = `data:image/webp;base64,${(
    await readFile(coverPagePath)
  ).toString("base64")}`;

  return ejs.renderFile(proposalTemplatePath, {
    data: payload,
    coverPageBackground,
  });
};
