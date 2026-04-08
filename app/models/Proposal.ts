import mongoose, { Model, Schema, Types } from "mongoose";

interface IProposalVersion {
  version: number;
  title: string;
  summary: string;
  pdfUrl: string;
  s3Key: string;
  proposalSpecific: Record<string, unknown>;
  renderPayload: Record<string, unknown>;
  createdAt: Date;
}

export interface IProposal {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyProfileId: Types.ObjectId;
  conversationId: Types.ObjectId;
  chatTitle: string;
  title: string;
  preparedFor: string;
  summary: string;
  status: "draft" | "finalized";
  proposalSpecific: Record<string, unknown>;
  renderPayload: Record<string, unknown>;
  pdfUrl: string;
  s3Key: string;
  version: number;
  latestVersion: number;
  latestPdfUrl: string;
  latestTitle: string;
  latestSummary: string;
  latestProposalSpecific: Record<string, unknown>;
  latestRenderPayload: Record<string, unknown>;
  versions: IProposalVersion[];
}

const proposalVersionSchema = new Schema<IProposalVersion>(
  {
    version: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    s3Key: { type: String, default: "" },
    proposalSpecific: {
      type: Schema.Types.Mixed,
      required: true,
    },
    renderPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  },
);

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
    chatTitle: { type: String, trim: true, default: "" },
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
    latestVersion: { type: Number, default: 1 },
    latestPdfUrl: { type: String, default: "" },
    latestTitle: { type: String, default: "" },
    latestSummary: { type: String, default: "" },
    latestProposalSpecific: {
      type: Schema.Types.Mixed,
      default: {},
    },
    latestRenderPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    versions: {
      type: [proposalVersionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Proposal = (mongoose.models.Proposal as Model<IProposal>) ||
  mongoose.model<IProposal>("Proposal", proposalSchema);

export default Proposal;
