#!/usr/bin/env python3
"""Backfill D1 `artifacts` rows from Cloudflare R2 using S3 API listings.

Requires environment:
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION=auto
- CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID

Uses:
- aws s3api list-objects-v2 --prefix ... (paginated)
- wrangler d1 execute ... --remote

Notes:
- Uses ETag as content_hash (good enough for initial backfill)
- Uses LastModified as fetched_at
- Ticker inferred from first path segment (e.g. mstr/8k/... -> MSTR)
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import tempfile
import uuid


def sh(cmd: str) -> str:
    return subprocess.check_output(["bash", "-lc", cmd], text=True)


def q(x: str | None) -> str:
    if x is None:
        return "NULL"
    return "'" + str(x).replace("'", "''") + "'"


def list_objects(endpoint: str, bucket: str, prefix: str, max_items: int) -> list[dict]:
    # use --max-items for overall limit; AWS CLI will automatically paginate using continuation tokens
    cmd = (
        f"aws s3api list-objects-v2 "
        f"--endpoint-url {shlex.quote(endpoint)} "
        f"--bucket {shlex.quote(bucket)} "
        f"--prefix {shlex.quote(prefix)} "
        f"--max-items {int(max_items)} "
        f"--output json"
    )
    raw = sh(cmd)
    j = json.loads(raw)
    return j.get("Contents", [])


def build_insert_sql(bucket: str, objects: list[dict], source_type: str) -> str:
    rows = []
    for obj in objects:
        key = obj["Key"]
        etag = obj.get("ETag", "").strip('"')
        last = obj.get("LastModified")
        ticker = key.split("/", 1)[0].upper() if "/" in key else None

        rows.append(
            (
                str(uuid.uuid4()),
                source_type,
                None,  # source_url unknown at backfill time
                etag,
                last,
                bucket,
                key,
                None,  # cik
                ticker,
                None,  # accession
            )
        )

    if not rows:
        return ""

    out = []
    out.append(
        "INSERT OR IGNORE INTO artifacts "
        "(artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, cik, ticker, accession) "
        "VALUES"
    )
    vals = []
    for v in rows:
        vals.append(
            "(" + ",".join([q(v[0]), q(v[1]), q(v[2]), q(v[3]), q(v[4]), q(v[5]), q(v[6]), q(v[7]), q(v[8]), q(v[9])]) + ")"
        )
    out.append(",\n".join(vals) + ";")
    return "\n".join(out) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--endpoint", required=True)
    ap.add_argument("--bucket", required=True)
    ap.add_argument("--prefix", required=True)
    ap.add_argument("--source-type", default="sec_filing")
    ap.add_argument("--max-items", type=int, default=200)
    ap.add_argument("--d1", default="dat-tracker")
    args = ap.parse_args()

    objs = list_objects(args.endpoint, args.bucket, args.prefix, args.max_items)
    print(f"listed {len(objs)} objects for prefix={args.prefix}")

    sql = build_insert_sql(args.bucket, objs, args.source_type)
    if not sql.strip():
        print("no objects; nothing to backfill")
        return

    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".sql") as f:
        f.write(sql)
        tmp = f.name

    # execute remote D1
    cmd = f"wrangler d1 execute {shlex.quote(args.d1)} --remote --file {shlex.quote(tmp)}"
    print(cmd)
    print(sh(cmd))

    # count inserted rows for prefix
    sql_count = f"SELECT COUNT(*) AS n FROM artifacts WHERE r2_key LIKE '{args.prefix}%';"
    count_cmd = (
        f"wrangler d1 execute {shlex.quote(args.d1)} --remote "
        f"--command {shlex.quote(sql_count)}"
    )
    print(sh(count_cmd))


if __name__ == "__main__":
    main()
