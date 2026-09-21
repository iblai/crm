import type { Metadata, Viewport } from "next";
import "./globals.css";
import { IblaiProviders } from "@/providers/iblai-providers";

// The middleware's nonce-based CSP requires per-request rendering.
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <IblaiProviders>{children}</IblaiProviders>
      </body>
    </html>
  );
}
