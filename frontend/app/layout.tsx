import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import Script from "next/script";
import MainHeader from "./components/header";
import { Footer } from "./components/footer";
import { AuthProvider } from "@/lib/AuthProvider";
import NotificationToasts from "./components/NotificationToasts";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Morent — Car Rental",
  description:
    "Browse the catalogue, get a price quote, and book a rental car with Stripe checkout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className={sans.variable}
        suppressHydrationWarning
      >
      <body className="font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <AuthProvider>
          <MainHeader />
          {children}
          <Footer />
          <NotificationToasts />
        </AuthProvider>
      </body>
    </html>
  );
}
