// src/app/layout.tsx
"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "~/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={`/sign-in`}
      signUpUrl={`/sign-up`}
      afterSignInUrl={`/chat`}
      afterSignUpUrl={`/chat`}
    >
      <html lang="en">
        <head>
          <title>HealthBot</title>
          <meta name="description" content="HealthBot AI Assistant" />
          <link rel="icon" href={`/favicon.ico`} />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} bg-neutral min-h-screen text-secondary antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}