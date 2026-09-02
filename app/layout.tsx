import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Vaultify", description: "Secure self-hosted file storage" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

