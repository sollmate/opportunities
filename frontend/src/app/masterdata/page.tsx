"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

import { ClientEditor } from "@/components/masterdata/ClientEditor";
import { ClientList } from "@/components/masterdata/ClientList";
import { NewChatButton } from "@/components/sidebar/NewChatButton";
import { SidebarShell } from "@/components/sidebar/SidebarShell";
import { UserMenu } from "@/components/ui";
import { useClients, useIndustries } from "@/hooks/useClients";
import { logout } from "@/lib/auth";

export default function MasterDataPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const clients = useClients();
  const industries = useIndustries();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  useEffect(() => {
    if (session?.error === "RefreshTokenError") signIn("microsoft-entra-id");
  }, [session?.error]);

  if (status !== "authenticated") return null;

  const selected = clients.clients.find((c) => c.client_id === clients.selectedId);
  const editing = creating || Boolean(selected);

  function startNew() {
    clients.setSelectedId(null);
    setCreating(true);
  }

  function selectClient(id: string) {
    setCreating(false);
    clients.setSelectedId(id);
  }

  function closeEditor() {
    setCreating(false);
    clients.setSelectedId(null);
  }

  function afterSave() {
    clients.reload();
    setCreating(false);
  }

  function afterDelete() {
    clients.reload();
    closeEditor();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarShell
        topAction={(collapsed) => (
          <NewChatButton
            collapsed={collapsed}
            onClick={startNew}
            label="New client"
          />
        )}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-none items-center justify-between border-b border-charcoal px-6 py-3">
          <h1 className="text-sm font-semibold text-text">Clients</h1>
          <UserMenu
            name={session.user?.name ?? session.user?.email ?? "You"}
            email={session.user?.email}
            onSignOut={logout}
          />
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-rows-1 lg:overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(460px,540px)]">
          <ClientList
            clients={clients.clients}
            selectedId={clients.selectedId}
            loading={clients.loading}
            error={clients.error}
            onSelect={selectClient}
            onRetry={clients.reload}
          />

          {editing ? (
            <ClientEditor
              key={creating ? "new" : clients.selectedId}
              client={creating ? null : selected ?? null}
              industries={industries}
              onSaved={afterSave}
              onDeleted={afterDelete}
              onCancel={closeEditor}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-charcoal p-8 text-center text-[13px] text-mute lg:h-full lg:min-h-0">
              Select a client to edit, or create a new one.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
