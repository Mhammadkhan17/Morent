import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata } from "next";
import MainHeader from "./components/header";
import { Footer } from "./components/footer";
import { AuthProvider } from "@/lib/AuthProvider";
import NotificationToasts from "./components/NotificationToasts";
import { RentalDataProvider } from "./context/RentalDataContext"; // Import the context provider
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Morent — Car Rental",
  description:
    "Rent the best cars at low prices. Book popular and recommended cars by the day with Morent.",
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
        {/* Stored/system theme before first paint — no flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AuthProvider>
          <RentalDataProvider>
            <MainHeader />
            {children}
            <Footer />
            <NotificationToasts />
          </RentalDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
