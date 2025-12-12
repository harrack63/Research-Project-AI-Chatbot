// src/app/sign-in/[[...sign-in]]/page.tsx
"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-900 border border-slate-800",
          },
        }}
        path={`/sign-in`}
        routing="path"
        signUpUrl={`/sign-up`}
        fallbackRedirectUrl={`/chat`}
      />
    </div>
  );
}