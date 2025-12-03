// middleware.ts (or proxy.ts on Next 15+)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const base = process.env.NEXT_PUBLIC_CLERK_BASE_PATH || "/healthChatbot";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = new URL(req.url);

  // Only handle subtree
  if (!pathname.startsWith(base)) return;

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files
    `/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)`,
    // Always run for API routes
    `/(api|trpc)(.*)`,
  ],
};