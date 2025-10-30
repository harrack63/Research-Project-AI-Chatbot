export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-900 to-blue-950">
      {children}
    </div>
  );
}