"""Thread history endpoint.

NOTE: this is a STUB. It returns static placeholder threads so the frontend
sidebar can be developed end to end. Real thread persistence (storage, per-user
scoping, the agent's own thread lifecycle) is owned by the agent backend
deliverable. Replace `_stub_threads()` with a real query when that lands; the
response contract (ThreadListResponse) is the seam and should not change.
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.schemas.thread import Thread, ThreadListResponse

router = APIRouter(prefix="/threads", tags=["threads"])


def _stub_threads() -> list[Thread]:
    now = datetime.now(UTC)
    hour = timedelta(hours=1)
    day = timedelta(days=1)
    return [
        Thread(
            id="t-cash-runway",
            title="Cash & runway — May review",
            preview="Cash closed May at €4.82M — up €148K on April. Runway holding at 11.4 months.",
            status="idle",
            updatedAt=now - 2 * hour,
            turnCount=8,
        ),
        Thread(
            id="t-vat-recon",
            title="May VAT reconciliation",
            preview=(
                "1,284 lines reconciled. Two intercompany lines flagged — apply reverse-charge?"
            ),
            status="awaiting_input",
            updatedAt=now - 3 * hour,
        ),
        Thread(
            id="t-board-pack",
            title="Q1 board pack — cover note",
            preview="Drafted the narrative on margin recovery and the SAP renegotiation outcome.",
            status="draft",
            updatedAt=now - 5 * hour,
        ),
        Thread(
            id="t-recurring-jes",
            title="Posted 38 recurring JEs for April",
            preview=(
                "All recurring accruals posted to GL — payroll, depreciation, and SaaS prepaids."
            ),
            status="idle",
            updatedAt=now - (day + 2 * hour),
            turnCount=38,
        ),
        Thread(
            id="t-nw-logistics",
            title="NW Logistics overdue — chase strategy",
            status="idle",
            updatedAt=now - 4 * day,
            turnCount=6,
        ),
        Thread(
            id="t-sap-licence",
            title="SAP licence renegotiation memo",
            status="draft",
            updatedAt=now - 6 * day,
        ),
    ]


@router.get("", response_model=ThreadListResponse)
async def list_threads(
    _user: Annotated[str, Depends(get_current_user)],
) -> ThreadListResponse:
    return ThreadListResponse(threads=_stub_threads())
