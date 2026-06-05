import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-blue-950 flex flex-col items-center justify-center p-6">
      <SignUp routing="hash" />
    </main>
  );
}
