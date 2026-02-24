#!/usr/bin/env node
/**
 * v0 verifier: loads all generated states/<ticker>/latest.json and performs basic checks.
 * Emits a deterministic report JSON + human SUMMARY.md
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { isHardIssue, policyV0, policyVersion } from './verifier-policy.js';

type Result = {
  ticker: string;
  ok: boolean;
  hardIssues: string[];
  warnIssues: string[];
};



async function readJson(p: string) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function summarize(report: { total: number; okCount: number; failCount: number; results: Result[] }) {
  const failing = report.results.filter((r) => !r.ok);
  const topIssues = new Map<string, number>();
  for (const r of failing) {
    for (const iss of [...r.hardIssues, ...r.warnIssues]) topIssues.set(iss, (topIssues.get(iss) ?? 0) + 1);
  }
  const top = Array.from(topIssues.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const lines: string[] = [];
  lines.push(`# CompanyState verification summary`);
  lines.push('');
  lines.push(`- total: ${report.total}`);
  lines.push(`- ok: ${report.okCount}`);
  lines.push(`- fail: ${report.failCount}`);
  lines.push('');
  if (failing.length) {
    lines.push('## Failing tickers');
    for (const r of failing.slice(0, 30)) {
      lines.push(`- ${r.ticker}: hard=[${r.hardIssues.join(', ')}] warn=[${r.warnIssues.join(', ')}]`);
    }
    if (failing.length > 30) lines.push(`- ...and ${failing.length - 30} more`);
    lines.push('');
    lines.push('## Top issues');
    for (const [k, n] of top) lines.push(`- ${k}: ${n}`);
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

async function main() {
  const repoRoot = process.cwd();
  const statesRoot = path.join(repoRoot, 'states');

  const runId = (arg('runId') || new Date().toISOString()).replace(/[:.]/g, '-');
  const outDir = path.join(repoRoot, 'verification-runs', 'company-state', runId);
  await fs.mkdir(outDir, { recursive: true });

  const tickers = (await fs.readdir(statesRoot)).filter((t) => !t.startsWith('.'));

  const results: Result[] = [];

  for (const ticker of tickers) {
    const issues: string[] = [];
    const p = path.join(statesRoot, ticker, 'latest.json');
    let j: any;
    try {
      j = await readJson(p);
    } catch (e: any) {
      results.push({ ticker, ok: false, hardIssues: [`read_failed:${String(e?.message ?? e)}`], warnIssues: [] });
      continue;
    }

    // Minimal v0 checks (deterministic)
    if (j.schemaVersion !== '0.1') issues.push('schemaVersion_not_0.1');

    // evidence_quality
    // Flag low-quality evidence URLs (index pages) so we can upgrade to exact links over time.
    const isLowQualityEvidenceUrl = (u: any, isUsLike: boolean): boolean => {
      if (typeof u !== 'string') return false;
      const s = u.toLowerCase();
      // obvious index/landing pages
      if (s.includes('cgi-bin/browse-edgar') || s.endsWith('/investors') || s.includes('/investor-relations')) return true;
      if (!isUsLike) return false;

      // US-like tickers: require direct SEC filing document links (Archives or ixviewer).
      const allow = [
        'sec.gov/archives/edgar/data/',
        'sec.gov/ixviewer',
        'sec.gov/ixviewer/documents',
      ];
      for (const a of allow) if (s.includes(a)) return false;

      // SEC browse pages, query endpoints, and generic SEC pages are too vague as evidence.
      if (s.includes('sec.gov')) return true;

      return false;
    };


    // require_listing_metadata
    // Require listing.country and listing.exchangeMic (warn-level).
    const ctry = j?.listing?.country;
    const mic = j?.listing?.exchangeMic;
    if (ctry == null || mic == null) {
      issues.push('missing_listing_metadata');
    }
    // require_holdings_asof
    // If holdings.amount is present, require holdings.asOf or holdingsLastUpdated (warn-level).
    // NOTE: temporarily disabled; generator will derive holdings.asOf when possible.

    // require_holdings_amount_number
    // Ensure holdings.amount is a finite number when present (hard).
    const ha2 = j?.holdings?.amount;
    if (ha2 != null && (typeof ha2 !== 'number' || !Number.isFinite(ha2))) {
      issues.push('invalid_holdings_amount');
    }

    // require_listing_currency
    // Require listing.currency (warn-level).
    const cur = j?.listing?.currency;
    if (cur == null) {
      issues.push('missing_listing_currency');
    }

    // require_cost_basis_evidence
    // If costBasisAvg is present, require a source URL (warn-level).
    const cb = j?.costBasisAvg;
    const cbUrl = j?.costBasisSourceUrl;
    if (cb != null && cbUrl == null) {
      issues.push('missing_cost_basis_evidence');
    }

    // require_shares_asof
    // If sharesForMnav is present, require shares.asOf (warn-level).
    const sfm2 = j?.shares?.sharesForMnav;
    const shAsOf = j?.shares?.asOf;
    if (sfm2 != null && shAsOf == null) {
      issues.push('missing_shares_asof');
    }

    // require_holdings_source
    // If holdings.amount is present, require holdings.source.holdingsSource (warn-level).
    const ha = j?.holdings?.amount;
    const hs = j?.holdings?.source?.holdingsSource;
    if (ha != null && hs == null) {
      issues.push('missing_holdings_source');

    // require_holdings_asof
    // If holdings.amount is present, require holdings.asOf or holdingsLastUpdated (warn-level).
    const ha3 = j?.holdings?.amount;
    const hasOf = j?.holdings?.asOf ?? j?.holdingsAsOf ?? j?.holdingsLastUpdated;
    if (ha3 != null && hasOf == null) {
      issues.push('missing_holdings_asof');
    }
    }

    // require_balance_sheet_numbers
    // Ensure balanceSheet numeric fields are finite numbers when present (hard).
    const bsNums = [
      ['cashReserves', j?.balanceSheet?.cashReserves],
      ['totalDebt', j?.balanceSheet?.totalDebt],
      ['preferredEquity', j?.balanceSheet?.preferredEquity],
    ];
    for (const [k, v] of bsNums) {
      if (v != null && (typeof v !== 'number' || !Number.isFinite(v))) {
        issues.push('invalid_balance_sheet_number:' + k);
      }
    }

    // require_sec_source_evidence
    // If holdings come from SEC, require at least a URL or accession to verify provenance.
    const hs2 = j?.holdings?.source?.holdingsSource;
    if (hs2 === 'sec-filing') {
      const url = j?.holdings?.source?.holdingsSourceUrl;
      const acc = j?.holdings?.source?.holdingsAccession;
      if (!url && !acc) issues.push('missing_sec_holdings_evidence');
    }

    // require_staking_evidence
    // If stakingPct is present, require a source URL (warn-level).
    const sp = j?.holdings?.source?.stakingPct ?? j?.stakingPct;
    const stUrl = j?.stakingSourceUrl;
    if (sp != null && stUrl == null) {
      issues.push('missing_staking_evidence');
    }

    // require_shares_source
    // If sharesForMnav is present, require some source metadata (warn-level).
    const sfm = j?.shares?.sharesForMnav;
    const shSrc = j?.shares?.source?.sharesSource;
    const shUrl = j?.shares?.source?.sharesSourceUrl;
    if (sfm != null && shSrc == null && shUrl == null) {
      issues.push('missing_shares_source');
    }
    // require_sec_shares_evidence
    // If shares appear to be SEC-sourced, require a URL.
    const ss = j?.shares?.source?.sharesSource;
    const ssUrl = j?.shares?.source?.sharesSourceUrl;
    if ((ss && String(ss).toLowerCase().includes('sec')) || (ssUrl && String(ssUrl).includes('sec.gov'))) {
      if (!ssUrl) issues.push('missing_sec_shares_evidence');
    }

    // require_cash_evidence
    // If cashReserves is present, require a source URL (warn-level).
    const cash = j?.balanceSheet?.cashReserves;
    const cashUrl = j?.balanceSheet?.source?.cashSourceUrl;
    if (cash != null && cashUrl == null) {
      issues.push('missing_cash_evidence');
    }

    // require_cash_asof
    // If cashReserves is present, require an asOf date (warn-level).
    const cash2 = j?.balanceSheet?.cashReserves;
    const cashAsOf = j?.balanceSheet?.asOf;
    if (cash2 != null && cashAsOf == null) {
      issues.push('missing_cash_asof');
    }

    // require_debt_evidence
    // If totalDebt is present, require a source URL (warn-level).
    const debt = j?.balanceSheet?.totalDebt;
    const debtUrl = j?.balanceSheet?.source?.debtSourceUrl;
    if (debt != null && debtUrl == null) {
      issues.push('missing_debt_evidence');
    }

    // require_debt_asof
    // If totalDebt is present, require an asOf date (warn-level).
    const debt2 = j?.balanceSheet?.totalDebt;
    const debtAsOf = j?.balanceSheet?.asOf;
    if (debt2 != null && debtAsOf == null) {
      issues.push('missing_debt_asof');
    }

    // require_preferred_evidence
    // If preferredEquity is present, require a source URL (warn-level).
    const pref = j?.balanceSheet?.preferredEquity;
    const prefUrl = j?.balanceSheet?.source?.preferredSourceUrl;
    if (pref != null && prefUrl == null) {
      issues.push('missing_preferred_evidence');
    }

    // require_preferred_asof
    // If preferredEquity is present, require an asOf date (warn-level).
    const pref2 = j?.balanceSheet?.preferredEquity;
    const prefAsOf = j?.balanceSheet?.asOf;
    if (pref2 != null && prefAsOf == null) {
      issues.push('missing_preferred_asof');
    }
    if (j.ticker !== ticker) issues.push('ticker_mismatch');
    if (!j.asOf) issues.push('missing_asOf');
    if (!j.generatedAt) issues.push('missing_generatedAt');
    if (!j.listing?.country) issues.push('missing_listing.country');
    if (!j.listing?.exchangeMic) issues.push('missing_listing.exchangeMic');
    if (!j.listing?.currency) issues.push('missing_listing.currency');
    if (!j.holdings?.asset) issues.push('missing_holdings.asset');
    if (typeof j.holdings?.amount !== 'number' || Number.isNaN(j.holdings?.amount)) issues.push('invalid_holdings.amount');


    // evidence_quality_checks (warn-level)
    const isUsLike = j?.listing?.country === 'US' || j?.secCik != null;
    const ev: Array<[string, any]> = [
      ['cash', j?.balanceSheet?.source?.cashSourceUrl],
      ['debt', j?.balanceSheet?.source?.debtSourceUrl],
      ['preferred', j?.balanceSheet?.source?.preferredSourceUrl],
      ['shares', j?.shares?.source?.sharesSourceUrl],
      ['holdings', j?.holdings?.source?.holdingsSourceUrl],
    ];
    for (const [k, u] of ev) {
      if (isLowQualityEvidenceUrl(u, isUsLike)) {
        issues.push('low_quality_evidence:' + k);
      }
    }

    const hardIssues = issues.filter((x) => isHardIssue(x));
    const warnIssues = issues.filter((x) => !isHardIssue(x));

    results.push({ ticker, ok: hardIssues.length === 0, hardIssues, warnIssues });
  }

  const okCount = results.filter((r) => r.ok).length;
  const report = {
    schemaVersion: '0.1',
    runId,
    total: results.length,
    okCount,
    failCount: results.length - okCount,
    results,
  };

  const reportPath = path.join(outDir, 'report.json');
  const summaryPath = path.join(outDir, 'SUMMARY.md');
  const latestVerifiedPath = path.join(repoRoot, 'infra', 'latest-verified.json');
  const gapsPath = path.join(repoRoot, 'infra', 'verification-gaps.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  // latest-verified pointer (derived from this run)
  const latestVerified = {
    schemaVersion: '0.1',
    policyVersion,
    policy: policyV0,

    generatedAt: new Date().toISOString(),
    runId,
    total: results.length,
    okCount,
    failCount: results.length - okCount,
    okTickers: results.filter((r) => r.ok).map((r) => r.ticker).sort(),
  };
  await fs.writeFile(latestVerifiedPath, JSON.stringify(latestVerified, null, 2) + '\n', 'utf8');
  // verification gaps: issue -> tickers
  const gaps: Record<string, string[]> = {};
  for (const r of results) {
    const all = [...(r as any).hardIssues, ...(r as any).warnIssues];
    for (const iss of all) {
      (gaps[iss] ||= []).push((r as any).ticker);
    }
  }
  for (const k of Object.keys(gaps)) gaps[k].sort();
  await fs.writeFile(gapsPath, JSON.stringify({ schemaVersion: '0.1', generatedAt: new Date().toISOString(), runId, gaps }, null, 2) + '\n', 'utf8');

  await fs.writeFile(summaryPath, summarize(report), 'utf8');

  console.log(`ok: wrote ${path.relative(repoRoot, reportPath)} and SUMMARY.md (ok=${okCount}/${results.length})`);
  process.exit(report.failCount ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

