# opportunities-frontend

Next.js (App Router) chat interface for the opportunities agent.

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
# App on http://localhost:3000
```

Point `NEXT_PUBLIC_API_BASE_URL` at the backend (default `http://localhost:8000`),
and fill in the Auth.js / Microsoft Entra ID values (`AUTH_SECRET`,
`AUTH_MICROSOFT_ENTRA_ID_*`). Generate a secret with `npx auth secret`. See the
root README for the Azure app registration steps.

## Checks

```bash
npm run lint
npm run build
```

## Structure

```
src/
├── app/                 App Router pages
│   ├── page.tsx         redirects to /chat or /login
│   ├── login/page.tsx   "Sign in with Microsoft" button
│   ├── chat/page.tsx    chat interface (auth-guarded)
│   └── api/auth/[...nextauth]/  Auth.js route handlers
├── auth.ts              Auth.js config (Microsoft Entra ID provider)
├── middleware.ts        redirects unauthenticated users to /login
├── components/chat/      ChatWindow, MessageList, MessageBubble, ChatInput
├── hooks/useChat.ts      chat state + send()
├── lib/                  api.ts (fetch + bearer), auth.ts (signIn/signOut)
└── types/chat.ts         mirrors backend schemas
```

Sign-in uses Auth.js with the Microsoft Entra ID provider; the Entra access
token is stored in the session. The chat flow: `useChat` posts the conversation
to `POST /api/chat` via `apiFetch`, which reads the session and attaches the
token as a bearer, then appends the assistant reply.
