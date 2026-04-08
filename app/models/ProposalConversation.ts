import mongoose, { Model, Schema, Types } from "mongoose";

export interface IProposalConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  version?: number;
  summary?: string;
  questionnaire?: unknown[];
  questionnaireAnswers?: unknown[];
  pdfUrl?: string;
  createdAt: Date;
}

export interface IProposalConversation {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  proposalId?: Types.ObjectId;
  chatTitle: string;
  prompt: string;
  status: "needs_more_info" | "ready";
  questionnaire: unknown[];
  questionnaireAnswers: unknown[];
  summary: string;
  messages: IProposalConversationMessage[];
}

const conversationMessageSchema = new Schema<IProposalConversationMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true, trim: true },
    version: { type: Number },
    summary: { type: String, default: "" },
    questionnaire: { type: Array, default: [] },
    questionnaireAnswers: { type: Array, default: [] },
    pdfUrl: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  },
);

const proposalConversationSchema = new Schema<IProposalConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      default: null,
      index: true,
    },
    chatTitle: { type: String, trim: true, default: "" },
    prompt: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["needs_more_info", "ready"],
      required: true,
    },
    questionnaire: { type: Array, default: [] },
    questionnaireAnswers: { type: Array, default: [] },
    summary: { type: String, default: "" },
    messages: {
      type: [conversationMessageSchema],
      default: [],
    },
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
