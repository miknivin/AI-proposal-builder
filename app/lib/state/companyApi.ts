import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type CompanyProfile = {
  name: string;
  tagline: string;
  about: string;
  passion: string;
  contactIntro: string;
  email: string;
  phone: string;
  website?: string;
  addressLines: string[];
  logoUrl: string;
  coreServices: string[];
  defaultPaymentTerms: Array<{ label: string; amountLabel?: string; amount?: number }>;
  accountDetails: {
    accountNo?: string;
    name?: string;
    ifsc?: string;
    bank?: string;
    upiId?: string;
    qrImage?: string;
  };
  apartCards: Array<{ title: string; description: string }>;
  isComplete?: boolean;
};

export const companyApi = createApi({
  reducerPath: "companyApi",
  baseQuery: fetchBaseQuery({ baseUrl: "", credentials: "include" }),
  tagTypes: ["CompanyProfile"],
  endpoints: (builder) => ({
    getProfile: builder.query<CompanyProfile | null, void>({
      query: () => ({ url: "/api/company-profile", method: "GET" }),
      transformResponse: (response: { profile?: CompanyProfile }) => response.profile ?? null,
      providesTags: ["CompanyProfile"],
    }),
    updateProfile: builder.mutation<
      { success: boolean; profile: CompanyProfile },
      CompanyProfile
    >({
      query: (body) => ({
        url: "/api/company-profile",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["CompanyProfile"],
    }),
  }),
});

export const { useGetProfileQuery, useUpdateProfileMutation } = companyApi;
