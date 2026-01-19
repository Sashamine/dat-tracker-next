#!/usr/bin/env python3
"""
Fetch shares outstanding data from SEC EDGAR XBRL API.

This script retrieves historical shares outstanding data for DAT Tracker companies
from SEC filings (10-K, 10-Q) using the EDGAR XBRL API.

Usage:
    python scripts/fetch-sec-shares.py [--ticker TICKER] [--output json|csv]

Examples:
    python scripts/fetch-sec-shares.py                    # Fetch all companies
    python scripts/fetch-sec-shares.py --ticker MSTR      # Fetch single company
    python scripts/fetch-sec-shares.py --output csv       # Output as CSV
"""

import argparse
import json
import time
import urllib.request
from datetime import datetime
from typing import Optional

# Ticker to CIK mapping for DAT Tracker companies
# CIK numbers are zero-padded to 10 digits for the API
TICKER_TO_CIK = {
    "MSTR": "0001050446",
    "MARA": "0001507605",
    "RIOT": "0001167419",
    "SMLR": "0001554859",
    "BTCS": "0001436229",
    "BTBT": "0001710350",
    "STKE": "0001846839",
    "DFDV": "0001805526",
    "KULR": "0001662684",
    "BMNR": "0001829311",
    "NAKA": "0001946573",
    "ABTC": "0001755953",
    "NXTT": "0001784970",
    "SBET": "0001981535",
    "ETHM": "0002028699",
    "GAME": "0001714562",
    "FGNX": "0001591890",
    "FWDI": "0000038264",
    "HSDT": "0001610853",
    "UPXI": "0001775194",
    "TAOX": "0001571934",
    "LITS": "0001262104",
    "CYPH": "0001509745",
    "CWD": "0001627282",
    "SUIG": "0001425355",
    "AVX": "0001826397",
    "ZONE": "0001956741",
    "TBH": "0001903595",
    "BTOG": "0001735556",
    "PURR": "0002078856",
    "HYPD": "0001682639",
    "TRON": "0001956744",
    "XRPN": "0002044009",
    "CLSK": "0000827876",
    "HUT": "0001964789",
    "CORZ": "0001839341",
    "BTDR": "0001899123",
    "DJT": "0001849635",
    "XXI": "0002070457",
    "ASST": "0001920406",
    "BNC": "0001482541",
    "CEPO": "0002027708",
    "TWAV": "0000746210",
}

# User agent required by SEC
USER_AGENT = "DATTracker research@example.com"


def fetch_company_facts(cik: str) -> Optional[dict]:
    """Fetch all company facts from SEC EDGAR."""
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

    req = urllib.request.Request(url)
    req.add_header("User-Agent", USER_AGENT)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        import sys
        print(f"  Error fetching {cik}: {e}", file=sys.stderr)
        return None


def extract_shares_data(facts: dict) -> list[dict]:
    """Extract shares outstanding data from company facts."""
    results = []

    dei = facts.get("facts", {}).get("dei", {})
    gaap = facts.get("facts", {}).get("us-gaap", {})

    # Priority 1: EntityCommonStockSharesOutstanding (point-in-time, most accurate)
    if "EntityCommonStockSharesOutstanding" in dei:
        entries = dei["EntityCommonStockSharesOutstanding"].get("units", {}).get("shares", [])
        for entry in entries:
            results.append({
                "date": entry.get("end"),
                "shares": entry.get("val"),
                "form": entry.get("form"),
                "filed": entry.get("filed"),
                "source": "EntityCommonStockSharesOutstanding",
                "fy": entry.get("fy"),
                "fp": entry.get("fp"),
            })

    # Priority 2: WeightedAverageNumberOfSharesOutstandingBasic (period average)
    if not results and "WeightedAverageNumberOfSharesOutstandingBasic" in gaap:
        entries = gaap["WeightedAverageNumberOfSharesOutstandingBasic"].get("units", {}).get("shares", [])
        for entry in entries:
            results.append({
                "date": entry.get("end"),
                "shares": entry.get("val"),
                "form": entry.get("form"),
                "filed": entry.get("filed"),
                "source": "WeightedAverageNumberOfSharesOutstandingBasic",
                "fy": entry.get("fy"),
                "fp": entry.get("fp"),
            })

    # Filter to only 10-K and 10-Q filings, deduplicate by date
    quarterly_forms = ["10-K", "10-Q", "10-K/A", "10-Q/A"]
    filtered = [r for r in results if r["form"] in quarterly_forms]

    # Deduplicate: keep the most recent filing for each period end date
    seen = {}
    for entry in sorted(filtered, key=lambda x: x.get("filed", ""), reverse=True):
        date = entry["date"]
        if date not in seen:
            seen[date] = entry

    # Sort by date
    return sorted(seen.values(), key=lambda x: x["date"])


def get_quarterly_shares(ticker: str) -> Optional[dict]:
    """Get quarterly shares outstanding for a ticker."""
    cik = TICKER_TO_CIK.get(ticker)
    if not cik:
        print(f"  No CIK found for {ticker}")
        return None

    facts = fetch_company_facts(cik)
    if not facts:
        return None

    entity_name = facts.get("entityName", "Unknown")
    shares_data = extract_shares_data(facts)

    # Filter to recent data (2023+)
    recent = [s for s in shares_data if s["date"] >= "2023-01-01"]

    return {
        "ticker": ticker,
        "cik": cik,
        "entityName": entity_name,
        "sharesData": recent,
        "sourceField": recent[0]["source"] if recent else None,
    }


def format_number(n: int) -> str:
    """Format number with underscores for readability."""
    if n >= 1_000_000_000:
        return f"{n:_}".replace("_", "_")
    elif n >= 1_000_000:
        return f"{n:_}".replace("_", "_")
    else:
        return f"{n:,}"


def print_results(results: list[dict], output_format: str = "text"):
    """Print results in the specified format."""
    if output_format == "json":
        print(json.dumps(results, indent=2))
        return

    if output_format == "csv":
        print("ticker,date,shares,form,filed,source")
        for r in results:
            for s in r.get("sharesData", []):
                print(f"{r['ticker']},{s['date']},{s['shares']},{s['form']},{s['filed']},{s['source']}")
        return

    # Text format
    for r in results:
        print(f"\n{'='*60}")
        print(f"{r['ticker']} - {r['entityName']}")
        print(f"CIK: {r['cik']}")
        print(f"Source field: {r['sourceField']}")
        print(f"{'='*60}")

        shares_data = r.get("sharesData", [])
        if not shares_data:
            print("  No shares data found")
            continue

        for s in shares_data:
            shares_formatted = format_number(s["shares"])
            print(f"  {s['date']}: {shares_formatted:>20} shares ({s['form']}, filed {s['filed']})")


def main():
    parser = argparse.ArgumentParser(description="Fetch SEC EDGAR shares outstanding data")
    parser.add_argument("--ticker", "-t", help="Single ticker to fetch (default: all)")
    parser.add_argument("--output", "-o", choices=["text", "json", "csv"], default="text",
                        help="Output format (default: text)")
    parser.add_argument("--quiet", "-q", action="store_true",
                        help="Suppress progress output (for piping)")
    args = parser.parse_args()

    import sys
    def log(msg):
        if not args.quiet:
            print(msg, file=sys.stderr)

    if args.ticker:
        tickers = [args.ticker.upper()]
    else:
        # Priority tickers first (major DAT companies)
        priority = ["MSTR", "MARA", "RIOT", "CLSK", "HUT", "CORZ", "BTDR", "KULR", "DJT"]
        others = [t for t in TICKER_TO_CIK.keys() if t not in priority]
        tickers = priority + others

    results = []
    total = len(tickers)

    for i, ticker in enumerate(tickers, 1):
        log(f"[{i}/{total}] Fetching {ticker}...")

        data = get_quarterly_shares(ticker)
        if data:
            results.append(data)
            count = len(data.get("sharesData", []))
            log(f"  OK ({count} entries)")
        else:
            log(f"  FAILED")

        # Rate limiting - SEC asks for max 10 requests per second
        if i < total:
            time.sleep(0.2)

    log(f"\nCompleted: {len(results)}/{total} companies")

    print_results(results, args.output)


if __name__ == "__main__":
    main()
