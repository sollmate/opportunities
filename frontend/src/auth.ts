import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID!;
const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!;
const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!;

// Request the API scope so Entra issues an access token whose audience is our
// backend ("Expose an API" -> access_as_user). That token carries the user's
// app `roles` claim, which the backend enforces. `offline_access` yields a
// refresh token so we can renew the access token without forcing re-login.
const apiScope = `api://${clientId}/access_as_user`;
const scope = `openid profile email offline_access ${apiScope}`;

// Entra v2 token endpoint, derived from the single-tenant issuer
// (https://login.microsoftonline.com/<tenant>/v2.0).
const tokenEndpoint = `${issuer.replace(/\/v2\.0\/?$/, "")}/oauth2/v2.0/token`;

// Renew slightly before the real expiry to avoid races where the token expires
// in flight between the session read and the backend call.
const EXPIRY_SKEW_SECONDS = 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      // clientId / clientSecret / issuer are read from AUTH_MICROSOFT_ENTRA_ID_*
      // env vars; issuer is the single-tenant authority, which restricts sign-in
      // to members of our tenant.
      authorization: { params: { scope } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist the access token, its expiry, and the refresh
      // token so we can renew later.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at; // seconds since epoch
        delete token.error;
        return token;
      }

      // Still valid: reuse the current access token.
      if (
        token.expiresAt &&
        Date.now() < (token.expiresAt - EXPIRY_SKEW_SECONDS) * 1000
      ) {
        return token;
      }

      // Expired and no way to renew — surface an error so the UI re-authenticates.
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" as const };
      }

      // Expired: rotate using the refresh token.
      try {
        const res = await fetch(tokenEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
            scope,
          }),
        });
        const refreshed = await res.json();
        if (!res.ok) throw refreshed;

        token.accessToken = refreshed.access_token;
        token.expiresAt =
          Math.floor(Date.now() / 1000) + Number(refreshed.expires_in);
        // Entra rotates refresh tokens; keep the previous one if none returned.
        if (refreshed.refresh_token) token.refreshToken = refreshed.refresh_token;
        delete token.error;
        return token;
      } catch {
        return { ...token, error: "RefreshTokenError" as const };
      }
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
