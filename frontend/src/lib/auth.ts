// Auth stub: stores a bearer token in localStorage. Replace token handling
// with a real auth flow (httpOnly cookies / session) when available.

const TOKEN_KEY = "opportunities.token";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status})`);
  }
  const data: { access_token: string } = await res.json();
  setToken(data.access_token);
}
