"""Pydantic schemas for master data."""
from __future__ import annotations

from pydantic import BaseModel


class MasterData(BaseModel):
    legal_form: str | None = None
    skr_variant: str | None = None
    prior_year_net_turnover: float | None = None
    current_year_turnover: float | None = None
    prior_year_profit: float | None = None
    prior_year_vat_liability: float | None = None
    current_vat_rhythm: str | None = None
    balance_sheet_total: float | None = None
    employees_avg: int | None = None


class MissingFields(BaseModel):
    fields: list[str]
    interview_questions: list[str]
