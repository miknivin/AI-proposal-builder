import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type SessionResponse = {
  success: boolean;
  user: { id: string; name: string; email: string };
  companyProfileComplete: boolean;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "",
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getSession: builder.query<SessionResponse, void>({
      query: () => ({ url: "/api/auth/session", method: "GET" }),
    }),
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: "/api/auth/session", method: "DELETE" }),
    }),
  }),
});

export const { useGetSessionQuery, useLogoutMutation } = authApi;
