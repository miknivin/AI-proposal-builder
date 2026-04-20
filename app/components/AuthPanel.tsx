"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AuthPanel() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const submit = async () => {
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.message ?? "Unable to continue.");
      return;
    }

    startTransition(() => {
      router.push(data.isComplete ? "/new" : "/onboarding");
      router.refresh();
    });
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="panel grid w-full max-w-6xl overflow-hidden rounded-4xl md:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[#2c241f] px-8 py-10 text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,187,120,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
          <div className="relative space-y-8">
            <p className="eyebrow text-white/70">AI Proposal Builder</p>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
                Build tailored client proposals without touching the template.
              </h1>
            </div>
          </div>
        </section>

        <section className="bg-surface px-6 py-8 md:px-10 md:py-12">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">Welcome back</h2>
            </div>

            <div className="grid-auto">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@company.com"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Password</span>
                <input
                  className="field"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Password"
                />
              </label>
            </div>

            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              className="button-primary w-full"
              disabled={isPending}
              onClick={submit}
            >
              {isPending ? "Please wait..." : "Login"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
