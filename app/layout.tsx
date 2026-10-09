import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { WebContainersLocaleProvider } from "@/components/web-containers-locale-provider";
import { IblaiProviders } from "@/providers/iblai-providers";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });

// The proxy's nonce-based CSP requires per-request rendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ibl.ai/crm",
    template: "%s · ibl.ai/crm",
  },
  description:
    "The open-source CRM for organizations on the ibl.ai platform — people, organizations, deals, activities.",
  applicationName: "ibl.ai/crm",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${openSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <WebContainersLocaleProvider>
            <IblaiProviders>{children}</IblaiProviders>
          </WebContainersLocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
