import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: User | null;
  companyProfileComplete: boolean;
  status: "idle" | "loading" | "error";
};

const initialState: AuthState = {
  user: null,
  companyProfileComplete: false,
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: PayloadAction<{ user: User; companyProfileComplete: boolean }>,
    ) => {
      state.user = action.payload.user;
      state.companyProfileComplete = action.payload.companyProfileComplete;
      state.status = "idle";
    },
    clearSession: (state) => {
      state.user = null;
      state.companyProfileComplete = false;
      state.status = "idle";
    },
    setLoading: (state) => {
      state.status = "loading";
    },
    setError: (state) => {
      state.status = "error";
    },
  },
});

export const { setSession, clearSession, setLoading, setError } = authSlice.actions;
export const authReducer = authSlice.reducer;
