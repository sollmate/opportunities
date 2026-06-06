import { apiFetch } from "@/lib/api";
import type {
  Client,
  ClientListResponse,
  ClientUpsert,
  Industry,
  IndustryListResponse,
} from "@/types/client";

/**
 * Client master-data API. Errors (auth, server, network) propagate to the
 * caller so the UI can show a real error state — we never substitute
 * placeholder data. Clients are org-wide, not per-user.
 */
export async function fetchClients(): Promise<Client[]> {
  const data = await apiFetch<ClientListResponse>("/api/clients");
  return data.clients;
}

export async function createClient(payload: ClientUpsert): Promise<Client> {
  return apiFetch<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateClient(
  clientId: string,
  payload: ClientUpsert,
): Promise<Client> {
  return apiFetch<Client>(`/api/clients/${clientId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteClient(clientId: string): Promise<void> {
  // Backend replies 204 No Content; apiFetch returns undefined for that.
  await apiFetch<void>(`/api/clients/${clientId}`, { method: "DELETE" });
}

export async function fetchIndustries(): Promise<Industry[]> {
  const data = await apiFetch<IndustryListResponse>("/api/reference/industries");
  return data.industries;
}
