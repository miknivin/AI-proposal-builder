import mongoose, { Model, Schema, Types } from "mongoose";

import type { CompanyProfileShape } from "@/app/types/proposal";

export interface ICompanyProfile extends Omit<CompanyProfileShape, "userId"> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
}

const companyProfileSchema = new Schema<ICompanyProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, trim: true, default: "" },
    tagline: { type: String, trim: true, default: "" },
    about: { type: String, trim: true, default: "" },
    passion: { type: String, trim: true, default: "" },
    contactIntro: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    addressLines: [{ type: String, trim: true }],
    logoUrl: { type: String, trim: true, default: "" },
    coreServices: [{ type: String, trim: true }],
    defaultPaymentTerms: [
      {
        label: { type: String, trim: true },
        amountLabel: { type: String, trim: true },
        amount: { type: Number },
      },
    ],
    accountDetails: {
      accountNo: { type: String, trim: true },
      name: { type: String, trim: true },
      ifsc: { type: String, trim: true },
      bank: { type: String, trim: true },
      upiId: { type: String, trim: true },
      qrImage: { type: String, trim: true },
    },
    apartCards: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    isComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const CompanyProfile = (mongoose.models.CompanyProfile as Model<ICompanyProfile>) ||
  mongoose.model<ICompanyProfile>("CompanyProfile", companyProfileSchema);

export default CompanyProfile;

