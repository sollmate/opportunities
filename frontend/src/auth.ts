import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;

// Request the API scope so Entra issues an access token whose audience is our
// backend ("Expose an API" -> access_as_user). That token carries the user's
// app `roles` claim, which the backend enforces.
const apiScope = `api://${clientId}/access_as_user`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      // clientId / clientSecret / issuer are read from AUTH_MICROSOFT_ENTRA_ID_*
      // env vars; issuer is the single-tenant authority, which restricts sign-in
      // to members of our tenant.
      authorization: {
        params: { scope: `openid profile email offline_access ${apiScope}` },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On sign-in, persist the Entra access token for forwarding to the backend.
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
