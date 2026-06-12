import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "~/styles/globals.css";
import { basePath } from "~/lib/global_vars";
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
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/chat"
      afterSignUpUrl="/chat"
      afterSignOutUrl="/sign-in"
    >
      <html lang="en">
        <head>
          <title>HealthBot</title>
          <meta name="description" content="HealthBot AI Assistant" />
          <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
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
