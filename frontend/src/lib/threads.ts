import { apiFetch } from "@/lib/api";
import type { Thread, ThreadListResponse } from "@/types/thread";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Mock thread history, mirroring the design prototype. Timestamps are
 * generated relative to "now" so the day-grouping (Today / Yesterday /
 * Last week) is demonstrable. Replaced by the real API response as soon
 * as GET /api/threads exists.
 */
function mockThreads(now: number): Thread[] {
  const at = (ms: number) => new Date(now - ms).toISOString();
  return [
    {
      id: "t-cash-runway",
      title: "Cash & runway — May review",
      preview:
        "Cash closed May at €4.82M — up €148K on April. Runway holding at 11.4 months.",
      status: "idle",
      updatedAt: at(2 * HOUR),
      turnCount: 8,
    },
    {
      id: "t-vat-recon",
      title: "May VAT reconciliation",
      preview:
        "1,284 lines reconciled. Two intercompany lines flagged — apply reverse-charge?",
      status: "awaiting_input",
      updatedAt: at(3 * HOUR),
    },
    {
      id: "t-board-pack",
      title: "Q1 board pack — cover note",
      preview:
        "Drafted the narrative on margin recovery and the SAP renegotiation outcome.",
      status: "draft",
      updatedAt: at(5 * HOUR),
    },
    {
      id: "t-recurring-jes",
      title: "Posted 38 recurring JEs for April",
      preview:
        "All recurring accruals posted to GL — payroll, depreciation, and SaaS prepaids.",
      status: "idle",
      updatedAt: at(DAY + 2 * HOUR),
      turnCount: 38,
    },
    {
      id: "t-intercompany-loan",
      title: "Lena's questions on intercompany loan",
      status: "idle",
      updatedAt: at(DAY + 6 * HOUR),
      turnCount: 11,
    },
    {
      id: "t-nw-logistics",
      title: "NW Logistics overdue — chase strategy",
      status: "idle",
      updatedAt: at(4 * DAY),
      turnCount: 6,
    },
    {
      id: "t-sap-licence",
      title: "SAP licence renegotiation memo",
      status: "draft",
      updatedAt: at(6 * DAY),
    },
  ];
}

/**
 * Fetch the user's thread history.
 *
 * Calls GET /api/threads; if the endpoint is not yet available (the agent
 * backend is a separate deliverable), it falls back to mock data so the UI
 * is fully workable. Swap nothing here once the backend ships — the contract
 * in types/thread.ts is the seam.
 */
export async function fetchThreads(): Promise<Thread[]> {
  try {
    const data = await apiFetch<ThreadListResponse>("/api/threads");
    return data.threads;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[threads] /api/threads unavailable — using mock data");
    }
    return mockThreads(Date.now());
  }
}
