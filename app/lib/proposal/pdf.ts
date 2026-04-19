import type { Browser as LocalBrowser } from "puppeteer";
import type { Browser as CoreBrowser, PDFOptions } from "puppeteer-core";

type PdfBrowser = CoreBrowser | LocalBrowser;

const PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "0",
    right: "0",
    bottom: "0",
    left: "0",
  },
};

const LOCAL_PUPPETEER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

const shouldUseServerlessChromium = () =>
  Boolean(process.env.AWS_EXECUTION_ENV) ||
  Boolean(process.env.AWS_REGION) ||
  Boolean(process.env.VERCEL) ||
  (process.env.NODE_ENV === "production" && process.platform === "linux");

const launchBrowser = async (): Promise<PdfBrowser> => {
  if (shouldUseServerlessChromium()) {
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    const headlessMode = "shell" as const;

    chromium.setGraphicsMode = false;

    return puppeteerCore.launch({
      args: puppeteerCore.defaultArgs({
        args: chromium.args,
        headless: headlessMode,
      }),
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ??
        process.env.CHROME_EXECUTABLE_PATH ??
        (await chromium.executablePath()),
      headless: headlessMode,
    });
  }

  const { default: puppeteer } = await import("puppeteer");

  return puppeteer.launch({
    headless: true,
    args: LOCAL_PUPPETEER_ARGS,
  });
};

export const generateProposalPdf = async (html: string) => {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    return await page.pdf(PDF_OPTIONS);
  } finally {
    await browser.close();
  }
};
