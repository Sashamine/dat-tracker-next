/**
 * Provenance Audit Script
 * Checks all companies for missing source URLs on key data fields.
 * Run: npx tsx scripts/provenance-audit.ts
 */

import { ethCompanies } from "../src/lib/data/companies";
import { btcCompanies } from "../src/lib/data/companies";

const allCompanies = [...ethCompanies, ...btcCompanies];

interface FieldAudit {
  field: string;
  hasValue: boolean;
  hasSource: boolean;
  hasSourceUrl: boolean;
  hasAsOf: boolean;
}

interface CompanyAudit {
  ticker: string;
  name: string;
  fields: FieldAudit[];
  score: number;      // % of applicable fields with full provenance
  missingUrls: string[];
  missingAll: string[]; // has value but no source at all
}

// Fields to audit: [displayField, sourceField, sourceUrlField, asOfField]
const AUDITABLE_FIELDS: [string, string, string, string | null][] = [
  ["holdings", "holdingsSource", "holdingsSourceUrl", "holdingsLastUpdated"],
  ["costBasisAvg", "costBasisSource", "costBasisSourceUrl", null],
  ["stakingPct", "stakingSource", "stakingSourceUrl", "stakingAsOf"],
  ["quarterlyBurnUsd", "burnSource", "burnSourceUrl", "burnAsOf"],
  ["cashReserves", "cashSource", "cashSourceUrl", "cashAsOf"],
  ["totalDebt", "debtSource", "debtSourceUrl", "debtAsOf"],
  ["preferredEquity", "preferredSource", "preferredSourceUrl", "preferredAsOf"],
  ["sharesForMnav", "sharesSource", "sharesSourceUrl", "sharesAsOf"],
];

function auditCompany(c: any): CompanyAudit {
  const fields: FieldAudit[] = [];
  const missingUrls: string[] = [];
  const missingAll: string[] = [];

  for (const [valueKey, sourceKey, urlKey, asOfKey] of AUDITABLE_FIELDS) {
    const hasValue = c[valueKey] != null && c[valueKey] !== 0;
    if (!hasValue) continue;  // Skip fields that don't have data

    const hasSource = !!c[sourceKey];
    const hasSourceUrl = !!c[urlKey];
    const hasAsOf = asOfKey ? !!c[asOfKey] : true; // null asOf = not required

    fields.push({ field: valueKey, hasValue, hasSource, hasSourceUrl, hasAsOf });

    if (!hasSourceUrl && hasSource) missingUrls.push(valueKey);
    if (!hasSource && !hasSourceUrl) missingAll.push(valueKey);
  }

  const total = fields.length;
  const complete = fields.filter(f => f.hasSource && f.hasSourceUrl).length;
  const score = total > 0 ? Math.round((complete / total) * 100) : 100;

  return { ticker: c.ticker, name: c.name, fields, score, missingUrls, missingAll };
}

// Run audit
const audits = allCompanies.map(auditCompany).sort((a, b) => a.score - b.score);

// Summary stats
const totalCompanies = audits.length;
const fullProvenance = audits.filter(a => a.score === 100).length;
const noProvenance = audits.filter(a => a.score === 0).length;
const avgScore = Math.round(audits.reduce((s, a) => s + a.score, 0) / totalCompanies);

// Field-level stats
const fieldStats: Record<string, { total: number; sourced: number; withUrl: number }> = {};
for (const [valueKey] of AUDITABLE_FIELDS) {
  fieldStats[valueKey] = { total: 0, sourced: 0, withUrl: 0 };
}
for (const audit of audits) {
  for (const f of audit.fields) {
    fieldStats[f.field].total++;
    if (f.hasSource) fieldStats[f.field].sourced++;
    if (f.hasSourceUrl) fieldStats[f.field].withUrl++;
  }
}

// Generate report
const lines: string[] = [];
lines.push("# Provenance Audit Report");
lines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
lines.push("");
lines.push("## Summary");
lines.push(`- **${totalCompanies}** companies audited`);
lines.push(`- **${fullProvenance}** with 100% provenance (${Math.round(fullProvenance/totalCompanies*100)}%)`);
lines.push(`- **${noProvenance}** with 0% provenance`);
lines.push(`- **Average score: ${avgScore}%**`);
lines.push("");

lines.push("## Field Coverage");
lines.push("");
lines.push("| Field | Has Data | Has Source | Has URL | Coverage |");
lines.push("|-------|----------|-----------|---------|----------|");
for (const [valueKey] of AUDITABLE_FIELDS) {
  const s = fieldStats[valueKey];
  const pct = s.total > 0 ? Math.round((s.withUrl / s.total) * 100) : 0;
  lines.push(`| ${valueKey} | ${s.total} | ${s.sourced} | ${s.withUrl} | ${pct}% |`);
}
lines.push("");

// Companies needing work (score < 100)
const needsWork = audits.filter(a => a.score < 100);
if (needsWork.length > 0) {
  lines.push("## Companies Needing Work");
  lines.push("");
  lines.push("| Ticker | Name | Score | Missing URL | No Source At All |");
  lines.push("|--------|------|-------|-------------|------------------|");
  for (const a of needsWork) {
    lines.push(`| ${a.ticker} | ${a.name} | ${a.score}% | ${a.missingUrls.join(", ") || "—"} | ${a.missingAll.join(", ") || "—"} |`);
  }
  lines.push("");
}

// Companies with full provenance
const complete = audits.filter(a => a.score === 100);
if (complete.length > 0) {
  lines.push("## ✅ Full Provenance");
  lines.push("");
  for (const a of complete) {
    lines.push(`- **${a.ticker}** (${a.name}) — ${a.fields.length} fields sourced`);
  }
  lines.push("");
}

// Priority list: companies with costBasisAvg but no source
lines.push("## 🔴 Priority: Cost Basis Without Source");
lines.push("");
const costBasisMissing = audits.filter(a => 
  a.fields.some(f => f.field === "costBasisAvg" && (!f.hasSource || !f.hasSourceUrl))
);
if (costBasisMissing.length === 0) {
  lines.push("All companies with cost basis data have sources. ✅");
} else {
  for (const a of costBasisMissing) {
    const f = a.fields.find(f => f.field === "costBasisAvg")!;
    const status = !f.hasSource ? "❌ No source text or URL" : "⚠️ Has source text, missing URL";
    lines.push(`- **${a.ticker}**: ${status}`);
  }
}
lines.push("");

const report = lines.join("\n");
console.log(report);

// Write report
const fs = require("fs");
fs.writeFileSync("scripts/provenance-audit-report.md", report);
console.log("\n→ Written to scripts/provenance-audit-report.md");
