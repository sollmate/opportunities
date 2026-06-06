// Authentication is handled by Auth.js (NextAuth) with the Microsoft Entra ID
// provider. These thin client-side helpers wrap the sign-in/out flow; the
// session (and the backend access token) is read via `useSession`/`getSession`.

import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";

export function login(): Promise<void> {
  return nextSignIn("microsoft-entra-id", { callbackUrl: "/chat" });
}

export function logout(): Promise<void> {
  return nextSignOut({ callbackUrl: "/login" });
}
