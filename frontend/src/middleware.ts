import { auth } from "@/auth";

// Primary gate: unauthenticated users hitting a protected route are redirected
// to the login page. Static assets and the Auth.js routes are excluded below.
export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|.*\\..*).*)"],
};
