import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-blue-950">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
