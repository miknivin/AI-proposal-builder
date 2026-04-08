"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const submit = async () => {
    setError("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email: form.email, password: form.password }
        : form;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
      <div className="panel grid w-full max-w-6xl overflow-hidden rounded-[32px] md:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[#2c241f] px-8 py-10 text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,187,120,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_30%)]" />
          <div className="relative space-y-8">
            <p className="eyebrow text-white/70">AI Proposal Builder</p>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight md:text-6xl">
                Build tailored client proposals without touching the template.
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/72 md:text-lg">
                Sign in, complete your company setup once, then let the guided AI workflow gather missing details through a clean questionnaire before exporting polished PDFs.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface px-6 py-8 md:px-10 md:py-12">
          <div className="mx-auto max-w-md space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Authentication</p>
              <h2 className="text-3xl font-semibold">
                {mode === "login" ? "Welcome back" : "Create your workspace"}
              </h2>
            </div>

            <div className="inline-flex rounded-full bg-[#efe7db] p-1">
              {(["login", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === value
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted"
                  }`}
                  onClick={() => setMode(value)}
                >
                  {value === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            <div className="grid-auto">
              {mode === "register" ? (
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Name</span>
                  <input
                    className="field"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Your full name"
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm font-medium">Email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
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
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Minimum 6 characters"
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
              {isPending ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
