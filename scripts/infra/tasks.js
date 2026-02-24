// Deterministic task handlers for reconcile loop.
// Each handler returns { changed: boolean }.
import fs from 'node:fs/promises';
import path from 'node:path';

export async function handleTask(taskId, repoRoot) {
  if (taskId === 'verifier_shares_source_url_if_present') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_shares_source')) return { changed: false };

    const insert = `\n    // require_shares_source\n    // If sharesForMnav is present, require some source metadata (warn-level).\n    const sfm = j?.shares?.sharesForMnav;\n    const shSrc = j?.shares?.source?.sharesSource;\n    const shUrl = j?.shares?.source?.sharesSourceUrl;\n    if (sfm != null && shSrc == null && shUrl == null) {\n      issues.push('missing_shares_source');\n    }\n`;

    const anchor = "issues.push('missing_sec_holdings_evidence');";
    const idx = s.indexOf(anchor);
    const pos = idx !== -1 ? s.indexOf('\n', idx) + 1 : s.indexOf("issues.push('schemaVersion_not_0.1');");
    if (pos === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', pos);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }

  if (taskId === 'verifier_debt_url_if_debt_present') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_debt_asof')) return { changed: false };

    const insert = `\n    // require_debt_asof\n    // If totalDebt is present, require an asOf date (warn-level).\n    const debt2 = j?.balanceSheet?.totalDebt;\n    const debtAsOf = j?.balanceSheet?.asOf;\n    if (debt2 != null && debtAsOf == null) {\n      issues.push('missing_debt_asof');\n    }\n`;

    const anchor = 'missing_debt_evidence';
    const idx = s.indexOf(anchor);
    const pos = idx !== -1 ? s.indexOf('\n', idx) + 1 : s.indexOf("issues.push('schemaVersion_not_0.1');");
    if (pos === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', pos);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }

  if (taskId === 'verifier_cash_asof') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_cash_asof')) return { changed: false };

    const insert = `\n    // require_cash_asof\n    // If cashReserves is present, require an asOf date (warn-level).\n    const cash2 = j?.balanceSheet?.cashReserves;\n    const cashAsOf = j?.balanceSheet?.asOf;\n    if (cash2 != null && cashAsOf == null) {\n      issues.push('missing_cash_asof');\n    }\n`;

    const anchor = 'missing_cash_evidence';
    const idx = s.indexOf(anchor);
    const pos = idx !== -1 ? s.indexOf('\n', idx) + 1 : s.indexOf("issues.push('schemaVersion_not_0.1');");
    if (pos === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', pos);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }

  

  if (taskId === 'verifier_mark_missing_staking_source') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_staking_evidence')) return { changed: false };

    const insert = `\n    // require_staking_evidence\n    // If stakingPct is present, require a source URL (warn-level).\n    const sp = j?.holdings?.source?.stakingPct ?? j?.stakingPct;\n    const stUrl = j?.stakingSourceUrl;\n    if (sp != null && stUrl == null) {\n      issues.push('missing_staking_evidence');\n    }\n`;

    const anchor = 'missing_sec_holdings_evidence';
    const idx = s.indexOf(anchor);
    const pos = idx != -1 ? s.indexOf('\n', idx) + 1 : s.indexOf("issues.push('schemaVersion_not_0.1');");
    if (pos == -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', pos);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }
  

  

  if (taskId === 'verifier_preferred_asof') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_preferred_asof')) return { changed: false };

    const insert = `\n    // require_preferred_asof\n    // If preferredEquity is present, require an asOf date (warn-level).\n    const pref2 = j?.balanceSheet?.preferredEquity;\n    const prefAsOf = j?.balanceSheet?.asOf;\n    if (pref2 != null && prefAsOf == null) {\n      issues.push('missing_preferred_asof');\n    }\n`;

    const anchor = 'missing_preferred_evidence';
    const idx = s.indexOf(anchor);
    const pos = idx !== -1 ? s.indexOf('\n', idx) + 1 : s.indexOf("issues.push('schemaVersion_not_0.1');");
    if (pos === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', pos);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }

  

  if (taskId === 'verifier_cash_source_metadata') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_cash_evidence')) return { changed: false };
    // already implemented elsewhere as missing_cash_evidence; treat as no-op
    return { changed: false };
  }


  if (taskId === 'verifier_debt_source_metadata') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_debt_evidence')) return { changed: false };
    // already implemented elsewhere as missing_debt_evidence; treat as no-op
    return { changed: false };
  }


  if (taskId === 'verifier_preferred_source_metadata') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_preferred_evidence')) return { changed: false };
    // already implemented elsewhere as missing_preferred_evidence; treat as no-op
    return { changed: false };
  }


  if (taskId === 'verifier_negative_numbers') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('invalid_negative_value')) return { changed: false };

    const insert = `
    // require_non_negative
    // Flag negative values for key numeric fields (hard).
    const nums = [
      ['holdings.amount', j?.holdings?.amount],
      ['shares.sharesForMnav', j?.shares?.sharesForMnav],
      ['balanceSheet.cashReserves', j?.balanceSheet?.cashReserves],
      ['balanceSheet.totalDebt', j?.balanceSheet?.totalDebt],
      ['balanceSheet.preferredEquity', j?.balanceSheet?.preferredEquity],
    ];
    for (const [k, v] of nums) {
      if (typeof v === 'number' && v < 0) issues.push('invalid_negative_value:' + k);
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_source_urls_valid') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('invalid_source_url')) return { changed: false };

    const insert = `
    // require_source_urls_http
    // If a sourceUrl is present, require http(s) scheme (warn-level).
    const urls = [
      j?.holdings?.source?.holdingsSourceUrl,
      j?.shares?.source?.sharesSourceUrl,
      j?.balanceSheet?.source?.cashSourceUrl,
      j?.balanceSheet?.source?.debtSourceUrl,
      j?.balanceSheet?.source?.preferredSourceUrl,
    ].filter((u) => u != null);
    for (const u of urls) {
      if (typeof u === 'string' && !(u.startsWith('http://') || u.startsWith('https://'))) {
        issues.push('invalid_source_url');
        break;
      }
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_shares_source_metadata') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_shares_source')) return { changed: false };
    // already covered by verifier_shares_source_url_if_present handler
    return { changed: false };
  }


  if (taskId === 'verifier_holdings_source_present') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_holdings_source')) return { changed: false };

    const insert = `
    // require_holdings_source
    // If holdings.amount is present, require holdings.source.holdingsSource (warn-level).
    const ha = j?.holdings?.amount;
    const hs = j?.holdings?.source?.holdingsSource;
    if (ha != null && hs == null) {
      issues.push('missing_holdings_source');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_shares_asof') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_shares_asof')) return { changed: false };

    const insert = `
    // require_shares_asof
    // If sharesForMnav is present, require shares.asOf (warn-level).
    const sfm2 = j?.shares?.sharesForMnav;
    const shAsOf = j?.shares?.asOf;
    if (sfm2 != null && shAsOf == null) {
      issues.push('missing_shares_asof');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_balance_sheet_numbers') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('invalid_balance_sheet_number')) return { changed: false };

    const insert = `
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
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_debt_asof') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_debt_asof')) return { changed: false };
    // already covered by verifier_debt_url_if_debt_present handler
    return { changed: false };
  }


  if (taskId === 'verifier_holdings_amount_number') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('invalid_holdings_amount')) return { changed: false };

    const insert = `
    // require_holdings_amount_number
    // Ensure holdings.amount is a finite number when present (hard).
    const ha2 = j?.holdings?.amount;
    if (ha2 != null && (typeof ha2 !== 'number' || !Number.isFinite(ha2))) {
      issues.push('invalid_holdings_amount');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_holdings_last_updated') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_holdings_asof')) return { changed: false };

    const insert = `
    // require_holdings_asof
    // If holdings.amount is present, require holdings.asOf or holdingsLastUpdated (warn-level).
    const ha3 = j?.holdings?.amount;
    const hasOf = j?.holdings?.asOf ?? j?.holdingsAsOf ?? j?.holdingsLastUpdated;
    if (ha3 != null && hasOf == null) {
      issues.push('missing_holdings_asof');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_currency_present') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_listing_currency')) return { changed: false };

    const insert = `
    // require_listing_currency
    // Require listing.currency (warn-level).
    const cur = j?.listing?.currency;
    if (cur == null) {
      issues.push('missing_listing_currency');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_listing_metadata') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_listing_metadata')) return { changed: false };

    const insert = `
    // require_listing_metadata
    // Require listing.country and listing.exchangeMic (warn-level).
    const ctry = j?.listing?.country;
    const mic = j?.listing?.exchangeMic;
    if (ctry == null || mic == null) {
      issues.push('missing_listing_metadata');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_cost_basis_evidence') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_cost_basis_evidence')) return { changed: false };

    const insert = `
    // require_cost_basis_evidence
    // If costBasisAvg is present, require a source URL (warn-level).
    const cb = j?.costBasisAvg;
    const cbUrl = j?.costBasisSourceUrl;
    if (cb != null && cbUrl == null) {
      issues.push('missing_cost_basis_evidence');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_holdings_sec_evidence') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_sec_holdings_evidence')) return { changed: false };
    // already covered by existing rule missing_sec_holdings_evidence
    return { changed: false };
  }


  if (taskId === 'verifier_shares_sec_evidence') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    if (s.includes('missing_sec_shares_evidence')) return { changed: false };

    const insert = `
    // require_sec_shares_evidence
    // If shares source indicates SEC, require sharesSourceUrl (hard).
    const shSrc2 = j?.shares?.source?.sharesSource;
    const shUrl2 = j?.shares?.source?.sharesSourceUrl;
    if (shSrc2 === 'sec-filing' && shUrl2 == null) {
      issues.push('missing_sec_shares_evidence');
    }
`;

    const anchor = "issues.push('schemaVersion_not_0.1');";
    const idx = s.indexOf(anchor);
    if (idx === -1) throw new Error('anchor_not_found');
    const after = s.indexOf('\n', idx);
    s = s.slice(0, after + 1) + insert + s.slice(after + 1);

    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }


  if (taskId === 'verifier_staking_evidence') {
    // Alias: handled by verifier_mark_missing_staking_source
    return await handleTask('verifier_mark_missing_staking_source', repoRoot);
  }
if (taskId === 'safety_probe_mutate_verifier') {
    const verifierPath = path.join(repoRoot, 'scripts/state/verify-company-states.ts');
    let s = await fs.readFile(verifierPath, 'utf8');
    // Always mutate deterministically by appending a probe comment once per run.
    const stamp = new Date().toISOString();
    s += `\n// SAFETY_PROBE ${stamp}\n`;
    await fs.writeFile(verifierPath, s, 'utf8');
    return { changed: true };
  }
  throw new Error(`unknown_task:${taskId}`);
}
