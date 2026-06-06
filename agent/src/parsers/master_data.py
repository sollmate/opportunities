"""Validate the master-data companion file and surface gaps for the interview."""
from __future__ import annotations

import json

from src.api.schemas.master_data import MasterData, MissingFields

QUESTIONS = {
    "legal_form": "Welche Rechtsform hat das Unternehmen (z. B. Einzelunternehmen, GmbH)?",
    "skr_variant": "Welcher Kontenrahmen wird verwendet — SKR03 oder SKR04?",
    "prior_year_net_turnover": "Wie hoch war der Nettoumsatz im Vorjahr (in EUR)?",
    "current_year_turnover": "Wie hoch ist der bisherige Umsatz im laufenden Jahr (in EUR)?",
    "prior_year_profit": "Wie hoch war der Gewinn im Vorjahr (in EUR)?",
    "prior_year_vat_liability": "Wie hoch war die USt-Zahllast im Vorjahr (in EUR)?",
    "current_vat_rhythm": "Wie ist der aktuelle Voranmeldungsrhythmus (monatlich/vierteljährlich/keiner)?",
}

# Minimum fields the statutory skills need to run at all.
REQUIRED = ["legal_form", "skr_variant", "prior_year_net_turnover", "current_year_turnover"]


def load_master_data(content: bytes | None) -> tuple[MasterData, MissingFields]:
    data = MasterData() if not content else MasterData(**json.loads(content))
    missing = [f for f in REQUIRED if getattr(data, f) in (None, "")]
    questions = [QUESTIONS[f] for f in missing if f in QUESTIONS]
    return data, MissingFields(fields=missing, interview_questions=questions)
