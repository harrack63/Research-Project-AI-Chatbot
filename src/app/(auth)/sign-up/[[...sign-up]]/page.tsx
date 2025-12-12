// src/app/sign-up/[[...sign-up]]/page.tsx
"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-900 border border-slate-800",
          },
        }}
        path={`/sign-up`}
        routing="path"
        signInUrl={`/sign-in`}
        fallbackRedirectUrl={`/chat`}
      />
    </div>
  );
}