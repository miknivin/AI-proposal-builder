import { NextRequest, NextResponse } from "next/server";

import { generateProposalPdf } from "@/app/lib/proposal/pdf";
import { renderProposalHtml } from "@/app/lib/proposal/render";
import type { ProposalRenderPayload } from "@/app/types/proposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sampleProposal: ProposalRenderPayload = {
  brandName: "Northwind Digital",
  title: "Website Design & Launch Proposal",
  preparedFor: "Acme Wellness",
  sectionTagline: "DIGITAL STRATEGY AND BRAND EXPERIENCES",
  coverTitleLine1: "WEBSITE",
  coverTitleLine2: "PROPOSAL",
  pageFooterLabel: "+ Website Proposal",
  aboutTitle: "ABOUT US",
  aboutText:
    "Northwind Digital partners with ambitious brands to design polished digital experiences that feel clear, premium, and conversion-focused. We blend strategy, design, and delivery so every touchpoint supports growth.",
  passionTitle: "OUR PASSION",
  passionText:
    "We care deeply about thoughtful presentation, intuitive user journeys, and launch-ready systems. Our work is built to help brands communicate with confidence and move customers from interest to action.",
  expertiseTitle: "OUR EXPERTISE",
  expertiseSubtitle:
    "We specialize in a wide range of digital and brand services, including",
  expertiseHighlightTitle: "FEATURED SERVICE",
  expertiseHighlightText:
    "Conversion-focused website design and launch systems tailored to premium service businesses.",
  expertiseCards: [
    {
      title: "Strategic Design",
      description:
        "We shape each page around positioning, trust, and conversion goals.",
    },
    {
      title: "Fast Delivery",
      description:
        "Our process keeps scope organized and execution moving without chaos.",
    },
    {
      title: "Launch Support",
      description:
        "We stay close through QA, handoff, and post-launch refinement.",
    },
  ],
  services: [
    {
      title: "Discovery & Sitemap",
      description:
        "Stakeholder workshop, page planning, content direction, and structure.",
      quantity: 1,
      unitPrice: 18000,
      columnValues: {
        gst: 3240,
        extraCharge: 0,
      },
    },
    {
      title: "UI Design",
      description:
        "High-fidelity responsive designs for five marketing pages and key sections.",
      quantity: 1,
      unitPrice: 42000,
      columnValues: {
        gst: 7560,
        extraCharge: 2500,
      },
    },
    {
      title: "Development & CMS Setup",
      description:
        "Responsive implementation, CMS configuration, forms, and analytics setup.",
      quantity: 1,
      unitPrice: 65000,
      columnValues: {
        gst: 11700,
        extraCharge: 5000,
      },
    },
    {
      title: "Launch QA",
      description:
        "Cross-device testing, performance review, and deployment support.",
      quantity: 1,
      unitPrice: 15000,
      columnValues: {
        gst: 2700,
        extraCharge: 0,
      },
    },
  ],
  pricingColumns: [
    { id: "price", label: "Base Price", type: "money" },
    { id: "gst", label: "GST", type: "money" },
    { id: "extraCharge", label: "Extra Charge", type: "money" },
  ],
  paymentTerms: [
    { label: "50% advance", amountLabel: "50% advance" },
    { label: "30% on design approval", amountLabel: "30% on design approval" },
    { label: "20% before launch", amountLabel: "20% before launch" },
  ],
  accountDetails: {
    accountNo: "456789123456",
    name: "Northwind Digital LLP",
    ifsc: "HDFC0001234",
    bank: "HDFC Bank",
    upiId: "northwind@hdfcbank",
    qrImage: "",
  },
  apartTitle: "What Sets Us Apart",
  apartCards: [
    {
      title: "Business-First Thinking",
      description:
        "Every recommendation is tied back to business clarity, trust, and conversion.",
    },
    {
      title: "Refined Execution",
      description:
        "We balance clean visual design with practical build decisions and launch readiness.",
    },
    {
      title: "Collaborative Process",
      description:
        "Structured reviews and clear communication help keep momentum high and surprises low.",
    },
  ],
  chooseTitle: "Choose Us",
  chooseText:
    "If you want a website that looks premium, feels easy to navigate, and supports real business goals, this engagement is designed to deliver that outcome with clarity and speed.",
  contactTitle: "Contact Us",
  contactText:
    "We would be glad to walk you through scope, timings, and next steps whenever you're ready.",
  contact: {
    company: "Northwind Digital",
    addressLines: [
      "14/2 Studio Avenue",
      "Indiranagar, Bengaluru 560038",
    ],
    phones: "+91 98765 43210",
    email: "hello@northwinddigital.com",
  },
  totals: {
    serviceTotal: 187700,
  },
  currencySymbol: "Rs. ",
  images: {
    logoHorizontal:
      "https://ik.imagekit.io/c1jhxlxiy/logo%20horizontal.png",
  },
};

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  const download = request.nextUrl.searchParams.get("download") === "1";
  const html = await renderProposalHtml(sampleProposal);

  if (format === "html") {
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  const pdf = await generateProposalPdf(html);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="proposal-preview.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
