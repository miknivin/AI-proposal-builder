"use client";

import { useEffect } from "react";

import { useGetSessionQuery } from "@/app/lib/state/authApi";
import { clearSession, setError, setLoading, setSession } from "@/app/lib/state/authSlice";
import { useAppDispatch } from "@/app/lib/state/store";

export function SessionLoader() {
  const dispatch = useAppDispatch();
  const { data, error, isFetching, isError } = useGetSessionQuery();

  useEffect(() => {
    if (isFetching) {
      dispatch(setLoading());
    }
  }, [isFetching, dispatch]);

  useEffect(() => {
    if (data?.success) {
      dispatch(
        setSession({
          user: data.user,
          companyProfileComplete: data.companyProfileComplete,
        }),
      );
    } else if (isError) {
      dispatch(clearSession());
      dispatch(setError());
    }
  }, [data, isError, dispatch]);

  return null;
}
