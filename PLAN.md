# AI Proposal Generator — Codex Implementation Guide

## Goal
Build an AI-powered proposal generator with:
- mandatory company setup after login
- guarded proposal prompt flow
- AI-assisted proposal drafting
- fixed EJS rendering
- Puppeteer PDF generation
- S3 storage
- MongoDB persistence

The base template structure comes from the uploaded EJS design and has been adapted so only the **logo** is dynamic while other images remain static. :contentReference[oaicite:0]{index=0}

---

## Stack
- Next.js
- MongoDB
- Redux
- Vercel AI Gateway
- EJS
- Puppeteer
- AWS S3

---

## Core Rules
1. Company profile setup is mandatory right after login.
2. Until company profile is complete, prompt APIs must return `COMPANY_PROFILE_INCOMPLETE`.
3. Separate data into:
   - `companySpecific`
   - `proposalSpecific`
4. AI must generate only proposal-specific content.
5. AI must never modify EJS markup.
6. Only logo is dynamic in images. All other images are static.
7. Final PDF is rendered from validated backend payload only.

---

## Flow
1. User logs in.
2. Backend checks company profile completeness.
3. If incomplete, redirect to company onboarding.
4. If complete, show proposal prompt UI.
5. User enters proposal prompt.
6. AI checks if proposal data is sufficient.
7. If missing:
   - ask focused questions
   - or open services modal
8. Once sufficient:
   - AI returns structured proposal-specific content
   - backend merges it with company-specific data
   - backend validates payload
   - EJS renders HTML
   - Puppeteer creates PDF
   - PDF uploads to S3
   - proposal draft, conversation, and version metadata save to MongoDB

---

## Company-Specific Data
Collect immediately after login and block prompt usage until complete.

```ts
type CompanyProfile = {
  userId: string;
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
  defaultPaymentTerms: Array<{
    label: string;
    amountLabel?: string;
    amount?: number;
  }>;
  accountDetails: {
    accountNo?: string;
    name?: string;
    ifsc?: string;
    bank?: string;
    upiId?: string;
    qrImage?: string;
  };
  apartCards: Array<{
    title: string;
    description: string;
  }>;
  isComplete: boolean;
};