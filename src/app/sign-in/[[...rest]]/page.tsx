import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-6">
      <SignIn routing="hash" />
    </main>
  );
}
