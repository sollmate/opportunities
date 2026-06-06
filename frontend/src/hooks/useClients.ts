"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SelectOption } from "@/components/ui/form";
import { fetchClients, fetchIndustries } from "@/lib/clients";
import type { Client, Industry } from "@/types/client";

export interface UseClients {
  clients: Client[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useClients(): UseClients {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchClients()
      .then((data) => {
        if (!cancelled) setClients(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load clients");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => reload(), [reload]);

  return { clients, selectedId, setSelectedId, loading, error, reload };
}

/** Load the industry lookup as ready-to-use Select options. */
export function useIndustries(): SelectOption[] {
  const [industries, setIndustries] = useState<Industry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchIndustries()
      .then((data) => {
        if (!cancelled) setIndustries(data);
      })
      .catch(() => {
        // The select simply stays empty if the lookup can't be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () =>
      industries.map((i) => ({
        value: String(i.industry_id),
        label: i.name,
        code: i.code ?? undefined,
      })),
    [industries],
  );
}
