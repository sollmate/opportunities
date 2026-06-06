"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { groupThreads, type ThreadGroup } from "@/lib/groupThreads";
import { fetchThreads } from "@/lib/threads";
import {
  filterThreads,
  relatedCommands,
  type SlashCommand,
} from "@/lib/searchThreads";
import type { Thread } from "@/types/thread";

export interface UseThreads {
  threads: Thread[];
  /** Day-grouped + query-filtered threads for rendering. */
  groups: ThreadGroup[];
  /** Slash-command suggestions for the current query (empty when not searching). */
  commands: SlashCommand[];
  query: string;
  setQuery: (q: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  matchCount: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useThreads(): UseThreads {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchThreads()
      .then((data) => {
        if (!cancelled) setThreads(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load threads");
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

  const filtered = useMemo(() => filterThreads(threads, query), [threads, query]);
  const groups = useMemo(() => groupThreads(filtered), [filtered]);
  const commands = useMemo(() => relatedCommands(query), [query]);

  return {
    threads,
    groups,
    commands,
    query,
    setQuery,
    activeId,
    setActiveId,
    matchCount: filtered.length,
    loading,
    error,
    reload,
  };
}
