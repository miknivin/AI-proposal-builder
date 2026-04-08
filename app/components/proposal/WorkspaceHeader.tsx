"use client";

import { useState } from "react";
import Link from "next/link";

import { EditIcon } from "@/app/components/icons/EditIcon";
import { HistoryIcon } from "@/app/components/icons/HistoryIcon";
import { LogoutIcon } from "@/app/components/icons/LogoutIcon";
import { UserIcon } from "@/app/components/icons/UserIcon";

type Props = {
  userName: string;
  companyName: string;
  showHistory: boolean;
  onNewChat: () => void;
  onToggleHistory: () => void;
  onLogout: () => void;
};

export function WorkspaceHeader({
  userName,
  companyName,
  showHistory,
  onNewChat,
  onToggleHistory,
  onLogout,
}: Props) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const headerInitial = companyName ? companyName.charAt(0).toUpperCase() : "C";

  return (
    <header className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold">
          {headerInitial}
        </div>
        <div>
          <p className="text-sm text-muted">Signed in as {userName}</p>
          <p className="text-base font-semibold">{companyName || "Company"}</p>
        </div>
      </div>
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
          onClick={onNewChat}
        >
          New chat
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
          onClick={onToggleHistory}
        >
          <HistoryIcon />
          {showHistory ? "Hide history" : "Show history"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm hover:bg-surface-strong"
          onClick={() => setUserMenuOpen((value) => !value)}
        >
          <UserIcon />
        </button>
        {userMenuOpen ? (
          <div className="absolute right-0 top-12 w-48 z-50 rounded-2xl border border-line bg-white shadow-lg">
            <Link
              href="/company"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-strong"
              onClick={() => setUserMenuOpen(false)}
            >
              <EditIcon />
              Edit profile
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface-strong"
              onClick={() => {
                setUserMenuOpen(false);
                onLogout();
              }}
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
