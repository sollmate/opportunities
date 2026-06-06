"""One-off DB inspector. Run: `uv run python scripts/inspect_db.py`."""
from __future__ import annotations

import psycopg
from dotenv import dotenv_values


def main() -> None:
    cfg = dotenv_values(".env")
    url = cfg.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL missing from .env")

    with psycopg.connect(url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_schema, table_name
                FROM information_schema.tables
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY 1, 2
                """
            )
            tables = cur.fetchall()
            print("=== TABLES ===")
            for s, t in tables:
                print(f"  {s}.{t}")

            for s, t in tables:
                cur.execute(
                    """
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = %s AND table_name = %s
                    ORDER BY ordinal_position
                    """,
                    (s, t),
                )
                cols = cur.fetchall()
                print(f"\n--- {s}.{t} ({len(cols)} cols) ---")
                for c in cols:
                    print(f"  {c[0]:30s} {c[1]:20s} {'NULL' if c[2]=='YES' else 'NOT NULL'}")

                cur.execute(f'SELECT count(*) FROM "{s}"."{t}"')
                print(f"  rows: {cur.fetchone()[0]}")

                cur.execute(f'SELECT * FROM "{s}"."{t}" LIMIT 3')
                for row in cur.fetchall():
                    print(f"  sample: {row}")


if __name__ == "__main__":
    main()
