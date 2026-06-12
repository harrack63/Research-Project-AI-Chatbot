import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtectedRoute = createRouteMatcher([
  "/healthChatbot/chat(.*)",
  "/healthChatbot/settings(.*)",
  "/chat(.*)",
  "/settings(.*)",
]);
const isPublicRoute = createRouteMatcher([
  "/healthChatbot/sign-in(.*)",
  "/healthChatbot/sign-up(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/healthChatbot/",
  "/",
  "/sso-callback(.*)",
  "/healthChatbot/sso-callback(.*)",
]);
export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
