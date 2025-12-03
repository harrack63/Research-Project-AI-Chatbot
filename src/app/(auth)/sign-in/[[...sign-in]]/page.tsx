import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="w-full max-w-md">
      <SignIn
        path={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-neutral-900 border border-neutral-700",
            headerTitle: "text-white font-semibold text-2xl",
            headerSubtitle: "text-neutral-400",
            socialButtonsBlockButton:
              "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700",
            formFieldLabel: "text-neutral-300",
            formFieldInput:
              "bg-neutral-800 border border-neutral-600 text-white placeholder-neutral-500 focus:border-blue-500",
            formButtonPrimary:
              "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
            footerActionLink: "text-blue-400 hover:text-blue-300",
            dividerLine: "bg-neutral-700",
            dividerText: "text-neutral-500",
          },
        }}
      />
    </div>
  );
}