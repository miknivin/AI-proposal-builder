import mongoose, { Model, Schema, Types } from "mongoose";

import type { QuestionnaireAnswer, QuestionnaireItem } from "@/app/types/proposal";

export interface IProposalConversation {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  prompt: string;
  status: "needs_more_info" | "ready";
  questionnaire: unknown[];
  questionnaireAnswers: unknown[];
  summary: string;
}

const proposalConversationSchema = new Schema<IProposalConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    prompt: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["needs_more_info", "ready"],
      required: true,
    },
    questionnaire: { type: Array, default: [] },
    questionnaireAnswers: { type: Array, default: [] },
    summary: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

const ProposalConversation =
  (mongoose.models.ProposalConversation as Model<IProposalConversation>) ||
  mongoose.model<IProposalConversation>(
    "ProposalConversation",
    proposalConversationSchema,
  );

export default ProposalConversation;


