import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Chat is hard-protected (redirect to sign-in).
// Profiles / matchups / tracker show an in-page auth dialog instead.
const isHardProtected = createRouteMatcher(["/chat(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isHardProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
