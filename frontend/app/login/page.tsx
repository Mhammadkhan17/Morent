import type { Metadata } from "next";
import LoginPage from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Morent",
};

export default function Page() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  return <LoginPage googleEnabled={googleEnabled} />;
}
