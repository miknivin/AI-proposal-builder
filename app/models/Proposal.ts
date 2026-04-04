import mongoose, { Model, Schema, Types } from "mongoose";

export interface IProposal {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyProfileId: Types.ObjectId;
  conversationId: Types.ObjectId;
  title: string;
  preparedFor: string;
  summary: string;
  status: "draft" | "finalized";
  proposalSpecific: Record<string, unknown>;
  renderPayload: Record<string, unknown>;
  pdfUrl: string;
  s3Key: string;
  version: number;
}

const proposalSchema = new Schema<IProposal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyProfileId: {
      type: Schema.Types.ObjectId,
      ref: "CompanyProfile",
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "ProposalConversation",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    preparedFor: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "finalized",
    },
    proposalSpecific: {
      type: Schema.Types.Mixed,
      required: true,
    },
    renderPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    pdfUrl: { type: String, default: "" },
    s3Key: { type: String, default: "" },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

const Proposal = (mongoose.models.Proposal as Model<IProposal>) ||
  mongoose.model<IProposal>("Proposal", proposalSchema);

export default Proposal;
