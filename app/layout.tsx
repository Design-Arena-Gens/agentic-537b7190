import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Video Agent",
  description:
    "Prompt-driven AI agent that plans and generates video content using state-of-the-art models.",
  metadataBase: new URL("https://agentic-537b7190.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-background text-white">
      <body className="min-h-screen bg-gradient-to-br from-background via-surface to-black">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-10 sm:px-8">
          {children}
        </div>
      </body>
    </html>
  );
}
