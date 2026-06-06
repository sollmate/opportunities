"use client";

import { Button } from "@/components/ui/Button";
import {
  Avatar,
  GroupedTable,
  StatusBadge,
  TableCard,
  TableHeader,
  TableScroll,
  useGroupedTable,
  type GroupedColumn,
  type TableGroup,
} from "@/components/ui/table";
import { statusTone, type Client, type Contact } from "@/types/client";

interface ClientListProps {
  clients: Client[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

const mono = (text: React.ReactNode) => (
  <span className="font-mono text-xs text-mute">{text}</span>
);

function columns(): GroupedColumn<Client, Contact>[] {
  return [
    {
      key: "name",
      header: "Client",
      renderParent: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.display_name} />
          <div className="min-w-0">
            <div className="font-medium text-text">{c.display_name}</div>
            <div className="font-mono text-[11px] text-mute">
              {c.client_number ?? "—"}
            </div>
          </div>
        </div>
      ),
      renderChild: (ct) => (
        <span className="text-text">
          {[ct.academic_title, ct.first_name, ct.last_name]
            .filter(Boolean)
            .join(" ")}
          {ct.is_primary && (
            <span className="ml-2 rounded-full border border-charcoal bg-ink-3 px-2 py-0.5 align-middle font-mono text-[10px] text-mute">
              primary
            </span>
          )}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      renderParent: (c) => (
        <span className="capitalize text-mute">{c.client_type}</span>
      ),
      renderChild: (ct) => mono(ct.job_position ?? "—"),
    },
    {
      key: "status",
      header: "Status",
      renderParent: (c) => (
        <StatusBadge tone={statusTone(c.status)}>
          <span className="capitalize">{c.status}</span>
        </StatusBadge>
      ),
    },
    {
      key: "contacts",
      header: "Contacts",
      align: "right",
      renderParent: (c) => (
        <span className="tabular-nums font-semibold text-text">
          {c.contacts.length}
        </span>
      ),
    },
  ];
}

/** Read/visualize grid for clients: each row expands to its contacts. */
export function ClientList({
  clients,
  selectedId,
  loading,
  error,
  onSelect,
  onRetry,
}: ClientListProps) {
  const groups: TableGroup<Client, Contact>[] = clients.map((c) => ({
    id: c.client_id,
    parent: c,
    children: c.contacts,
  }));
  const ctrl = useGroupedTable(groups);

  return (
    <TableCard className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <TableHeader
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"} · click a row to view · chevron expands contacts`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={ctrl.expandAll}>
              Expand all
            </Button>
            <Button variant="secondary" size="sm" onClick={ctrl.collapseAll}>
              Collapse all
            </Button>
          </>
        }
      />
      <TableScroll axis="both">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-[13px] text-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <p className="px-6 py-12 text-center text-[13px] text-mute">
            Loading clients…
          </p>
        ) : clients.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-mute">
            No clients yet. Use “New client” to add one.
          </p>
        ) : (
          <GroupedTable
            columns={columns()}
            groups={groups}
            controller={ctrl}
            minWidth={720}
            onParentClick={(c) => onSelect(c.client_id)}
            selectedId={selectedId ?? undefined}
          />
        )}
      </TableScroll>
    </TableCard>
  );
}
