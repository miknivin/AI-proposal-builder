/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { useUpdateProfileMutation } from "@/app/lib/state/companyApi";

type OnboardingProfile = {
  name?: string;
  tagline?: string;
  about?: string;
  passion?: string;
  contactIntro?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLines?: string[];
  logoUrl?: string;
  coreServices?: string[];
  defaultPaymentTerms?: Array<{
    label?: string;
    paymentTitle?: string;
    paymentPercent?: number;
    amountLabel?: string;
    amount?: number;
  }>;
  accountDetails?: {
    accountNo?: string;
    name?: string;
    ifsc?: string;
    bank?: string;
    upiId?: string;
    qrImage?: string;
  };
  apartCards?: Array<{ title: string; description: string }>;
};

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

type Step = "basics" | "story" | "services" | "accounts" | "differentiators";

const steps: Array<{ id: Step; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "story", label: "Story" },
  { id: "services", label: "Services & Terms" },
  { id: "accounts", label: "Accounts & QR" },
  { id: "differentiators", label: "Differentiators" },
];

export function OnboardingForm({
  initialProfile,
  userEmail,
}: {
  initialProfile: OnboardingProfile | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<{
    summary: string;
    details?: string[];
  } | null>(null);
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [updateProfile] = useUpdateProfileMutation();
  const [step, setStep] = useState<Step>("basics");
  const [uploading, setUploading] = useState<null | "qr" | "logo">(null);

  const [form, setForm] = useState({
    name: initialProfile?.name ?? "",
    tagline: initialProfile?.tagline ?? "",
    about: initialProfile?.about ?? "",
    passion: initialProfile?.passion ?? "",
    contactIntro: initialProfile?.contactIntro ?? "",
    email: initialProfile?.email || userEmail,
    phone: initialProfile?.phone ?? "",
    website: initialProfile?.website ?? "",
    logoUrl: initialProfile?.logoUrl ?? "",
    addressLines: initialProfile?.addressLines?.join("\n") ?? "",
    coreServices:
      initialProfile?.coreServices && initialProfile.coreServices.length
        ? initialProfile.coreServices
        : [],
    defaultPaymentTerms:
      initialProfile?.defaultPaymentTerms
        ?.map((item) => item.label ?? item.paymentTitle ?? "")
        .join("\n") ?? "50% advance\n50% on completion",
    apartCards: initialProfile?.apartCards ?? [
      { title: "Creative Approach", description: "We tailor every proposal." },
      {
        title: "Reliable Delivery",
        description: "We keep communication clear.",
      },
      { title: "Business Impact", description: "We focus on outcomes." },
    ],
    accountNo: initialProfile?.accountDetails?.accountNo ?? "",
    accountName: initialProfile?.accountDetails?.name ?? "",
    ifsc: initialProfile?.accountDetails?.ifsc ?? "",
    bank: initialProfile?.accountDetails?.bank ?? "",
    upiId: initialProfile?.accountDetails?.upiId ?? "",
    qrImage: initialProfile?.accountDetails?.qrImage ?? "",
  });

  const addressLinesArray = splitLines(form.addressLines);

  const isFormValid =
    form.name.trim().length > 0 &&
    form.tagline.trim().length > 0 &&
    form.about.trim().length >= 20 &&
    form.passion.trim().length >= 20 &&
    form.contactIntro.trim().length >= 10 &&
    addressLinesArray.length >= 2 &&
    form.coreServices.length >= 1;

  const goNext = () => {
    const idx = steps.findIndex((s) => s.id === step);
    if (idx < steps.length - 1) setStep(steps[idx + 1].id);
  };

  const goPrev = () => {
    const idx = steps.findIndex((s) => s.id === step);
    if (idx > 0) setStep(steps[idx - 1].id);
  };

  const handleUpload = async (file: File, kind: "qr" | "logo") => {
    if (file.size > 3 * 1024 * 1024) {
      setError({ summary: `${kind.toUpperCase()} file too large (max 3MB).` });
      return;
    }
    setUploading(kind);
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          kind,
        }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.uploadUrl) {
        throw new Error(presignData.message || "Unable to get upload URL");
      }

      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      setForm((current) => ({
        ...current,
        qrImage: kind === "qr" ? presignData.publicUrl : current.qrImage,
        logoUrl: kind === "logo" ? presignData.publicUrl : current.logoUrl,
      }));
    } catch (e: any) {
      setError({ summary: e.message ?? `${kind.toUpperCase()} upload failed` });
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    setError(null);
    setSuccess("");

    const payload = {
      name: form.name,
      tagline: form.tagline,
      about: form.about,
      passion: form.passion,
      contactIntro: form.contactIntro,
      email: form.email,
      phone: form.phone,
      website: form.website,
      addressLines: splitLines(form.addressLines),
      logoUrl: form.logoUrl,
      coreServices: form.coreServices,
      defaultPaymentTerms: splitLines(form.defaultPaymentTerms).map(
        (label) => ({ label }),
      ),
      accountDetails: {
        accountNo: form.accountNo,
        name: form.accountName,
        ifsc: form.ifsc,
        bank: form.bank,
        upiId: form.upiId,
        qrImage: form.qrImage,
      },
      apartCards: form.apartCards,
    };

    try {
      const result = await updateProfile(payload).unwrap();
      if (result.success) {
        setSuccess(
          "Company profile saved. Redirecting to the proposal builder...",
        );
        startTransition(() => {
          router.push("/new");
          router.refresh();
        });
      } else {
        setError({ summary: "Unable to save company profile." });
      }
    } catch (err: any) {
      const rawMessage =
        err?.data?.message ?? err?.message ?? "Unable to save company profile.";

      let details: string[] | undefined;
      try {
        const parsed = JSON.parse(rawMessage);
        if (Array.isArray(parsed)) {
          details = parsed.map(
            (item) =>
              `${item.path?.join(".") ?? "field"}: ${
                item.message ?? item.code ?? "invalid"
              }`,
          );
        }
      } catch {
        // Not JSON; ignore
      }

      setError({ summary: rawMessage, details });
    }
  };

  return (
    <div className="app-shell min-h-screen px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                step === s.id
                  ? "bg-accent text-white"
                  : "bg-white border border-line"
              }`}
              onClick={() => setStep(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="panel rounded-[28px] p-5 md:p-8 space-y-6">
          {step === "basics" && (
            <div className="space-y-4">
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Company name</span>
                  <input
                    className="field"
                    value={form.name}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, name: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Tagline</span>
                  <input
                    className="field"
                    value={form.tagline}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, tagline: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Contact email</span>
                  <input
                    className="field"
                    value={form.email}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, email: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Phone</span>
                  <input
                    className="field"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, phone: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Website</span>
                  <input
                    className="field"
                    value={form.website}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, website: e.target.value }))
                    }
                    placeholder="https://example.com"
                  />
                </label>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Logo</span>
                  <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-strong p-4">
                    <div className="flex gap-3 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(file, "logo");
                        }}
                      />
                      {uploading === "logo" ? (
                        <span className="text-sm text-muted">Uploading...</span>
                      ) : null}
                    </div>
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo"
                        className="h-20 w-40 object-contain rounded-xl border border-line bg-white"
                      />
                    ) : (
                      <p className="text-sm text-muted">
                        Max size 3MB. PNG/JPG.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "story" && (
            <div className="space-y-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Address lines</span>
                <textarea
                  className="textarea"
                  value={form.addressLines}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, addressLines: e.target.value }))
                  }
                  placeholder={"Line 1\nLine 2\nCity, State"}
                />
              </label>
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">
                    About your company
                  </span>
                  <textarea
                    className="textarea"
                    value={form.about}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, about: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Passion statement</span>
                  <textarea
                    className="textarea"
                    value={form.passion}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, passion: e.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Contact intro</span>
                <textarea
                  className="textarea"
                  value={form.contactIntro}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, contactIntro: e.target.value }))
                  }
                />
              </label>
            </div>
          )}

          {step === "services" && (
            <div className="space-y-4">
              <div className="grid-auto cols-1">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Core services</span>
                  {form.coreServices.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.coreServices.map((service, idx) => (
                        <span
                          key={`${service}-${idx}`}
                          className="inline-flex items-center gap-2 rounded-full bg-surface-strong border border-line px-3 py-1 text-sm"
                        >
                          {service}
                          <button
                            type="button"
                            className="text-muted hover:text-foreground"
                            onClick={() =>
                              setForm((c) => ({
                                ...c,
                                coreServices: c.coreServices.filter(
                                  (_, i) => i !== idx,
                                ),
                              }))
                            }
                            aria-label={`Remove ${service}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    className="field mt-2"
                    placeholder="Add a service and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (
                          e.target as HTMLInputElement
                        ).value.trim();
                        if (!value) return;
                        setForm((c) => ({
                          ...c,
                          coreServices: [...c.coreServices, value],
                        }));
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">
                    Default payment terms
                  </span>
                  <textarea
                    className="textarea"
                    value={form.defaultPaymentTerms}
                    onChange={(e) =>
                      setForm((c) => ({
                        ...c,
                        defaultPaymentTerms: e.target.value,
                      }))
                    }
                    placeholder={"50% advance\n50% on completion"}
                  />
                </label>
              </div>
            </div>
          )}

          {step === "accounts" && (
            <div className="space-y-4">
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Account number</span>
                  <input
                    className="field"
                    value={form.accountNo}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, accountNo: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Account name</span>
                  <input
                    className="field"
                    value={form.accountName}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, accountName: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">IFSC</span>
                  <input
                    className="field"
                    value={form.ifsc}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, ifsc: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Bank</span>
                  <input
                    className="field"
                    value={form.bank}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, bank: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid-auto cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">UPI ID</span>
                  <input
                    className="field"
                    value={form.upiId}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, upiId: e.target.value }))
                    }
                  />
                </label>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">QR code image</span>
                  <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-strong p-4">
                    <div className="flex gap-3 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUpload(file, "qr");
                        }}
                      />
                      {uploading === "qr" ? (
                        <span className="text-sm text-muted">Uploading...</span>
                      ) : null}
                    </div>
                    {form.qrImage ? (
                      <img
                        src={form.qrImage}
                        alt="QR"
                        className="h-32 w-32 object-contain rounded-xl border border-line bg-white"
                      />
                    ) : (
                      <p className="text-sm text-muted">
                        Max size 3MB. PNG/JPG.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "differentiators" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">What sets you apart</span>
                <button
                  type="button"
                  className="button-secondary px-3 py-1 text-sm"
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      apartCards: [
                        ...c.apartCards,
                        { title: "", description: "" },
                      ],
                    }))
                  }
                >
                  Add item
                </button>
              </div>
              <div className="space-y-3">
                {form.apartCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-line bg-surface-strong p-4 space-y-3"
                  >
                    <div className="grid-auto cols-2 gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium">Title</span>
                        <input
                          className="field"
                          value={card.title}
                          onChange={(e) =>
                            setForm((c) => {
                              const next = [...c.apartCards];
                              next[idx] = {
                                ...next[idx],
                                title: e.target.value,
                              };
                              return { ...c, apartCards: next };
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium">Description</span>
                        <textarea
                          className="textarea"
                          value={card.description}
                          onChange={(e) =>
                            setForm((c) => {
                              const next = [...c.apartCards];
                              next[idx] = {
                                ...next[idx],
                                description: e.target.value,
                              };
                              return { ...c, apartCards: next };
                            })
                          }
                          rows={2}
                        />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            apartCards: c.apartCards.filter(
                              (_, i) => i !== idx,
                            ),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {form.apartCards.length === 0 ? (
                  <p className="text-sm text-muted">
                    Add at least one differentiator.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 space-y-2">
              <div className="font-medium">{error.summary}</div>
              {error.details && error.details.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {error.details.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={goPrev}
                disabled={step === "basics"}
              >
                Previous
              </button>
              {step !== "differentiators" ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={goNext}
                >
                  Next
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="button-primary"
              disabled={isPending || !isFormValid}
              onClick={() => startTransition(() => void submit())}
            >
              {isPending
                ? "Saving..."
                : !isFormValid
                  ? "Complete required fields"
                  : "Save and continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

