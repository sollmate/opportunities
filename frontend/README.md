# opportunities-frontend

Next.js (App Router) chat interface for the opportunities agent.

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
# App on http://localhost:3000
```

Point `NEXT_PUBLIC_API_BASE_URL` at the backend (default `http://localhost:8000`).

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
│   ├── login/page.tsx   stub login form
│   └── chat/page.tsx    chat interface (auth-guarded)
├── components/chat/      ChatWindow, MessageList, MessageBubble, ChatInput
├── hooks/useChat.ts      chat state + send()
├── lib/                  api.ts (fetch + bearer), auth.ts (token + login)
└── types/chat.ts         mirrors backend schemas
```

The chat flow: `useChat` posts the conversation to `POST /api/chat` via `apiFetch`
(which attaches the bearer token) and appends the assistant reply.
