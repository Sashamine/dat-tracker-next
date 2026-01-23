# Known Patterns Database

This document tracks known issues, past mistakes, and company-specific quirks that the Challenger agent should check against.

---

## Past Mistakes (Learn From These)

### MARA Basic vs Diluted Confusion
**Date**: 2026-01-22
**Error**: Used basic shares (378M) instead of diluted (470M)
**Root cause**: SEC filing has both numbers; grabbed the wrong one
**Prevention**: Always search for "diluted" keyword; verify number includes stock options and convertibles

### MSTR Holdings Without 8-K
**Date**: 2026-01-22
**Error**: Entered 725,000 BTC with no supporting 8-K
**Root cause**: Used web search result, didn't verify against filing
**Prevention**: MSTR holdings changes MUST have 8-K citation; press releases alone insufficient

### XXI Class B Shares Missed
**Date**: 2026-01-21
**Error**: mNAV.com showed only Class A shares, missed Class B
**Root cause**: Aggregator was incomplete
**Prevention**: For dual-class companies, always sum all share classes from SEC filing

### HSDT Reverse Split Missed
**Date**: 2026-01-22
**Error**: Share count not adjusted for 1:50 reverse split
**Root cause**: Historical value from before split
**Prevention**: Check recent 8-K filings for split announcements

### NXTT Reverse Split Missed
**Date**: 2026-01-22
**Error**: Share count not adjusted for 200:1 reverse split
**Root cause**: Same as HSDT
**Prevention**: Same - check for splits

---

## Company-Specific Patterns

### MSTR (MicroStrategy / Strategy)
| Issue | Check |
|-------|-------|
| Holdings require 8-K | Press release alone not sufficient |
| Dual share classes | Class A common + Class B (10 votes) |
| Frequent purchases | Check strategy.com dashboard for real-time |
| Large ATM program | Shares may increase between 10-Qs |

**Trusted sources**:
- strategy.com/bitcoin (real-time holdings + fdShares)
- SEC 8-K (official filings)

### MARA (Marathon Digital)
| Issue | Check |
|-------|-------|
| Basic vs diluted | ALWAYS verify "diluted" in source |
| Bitcoin miner | Holdings fluctuate with mining + sales |
| ATM program active | Shares increase between quarters |

**Historical error**: 378M basic was mistaken for diluted (actual: 470M)

### XXI (Twenty One Capital)
| Issue | Check |
|-------|-------|
| Dual-class structure | Class A + Class B = total |
| mNAV.com wrong | Showed only Class A |
| New company | Limited track record |

**Must sum**: Class A shares + Class B shares for sharesForMnav

### Metaplanet
| Issue | Check |
|-------|-------|
| Japan-based | EDINET filings, not SEC |
| Complex preferred | Check total vs common shares |
| Currency | JPY financials, need conversion |
| Active buyer | Frequent press releases |

**Trusted source**: metaplanet.jp/bitcoin

### HUT 8
| Issue | Check |
|-------|-------|
| mNAV often wrong | Cross-reference with SEC only |
| Canadian origin | SEDAR filings available |
| Miner with sales | Holdings decrease with sales |

### KULR
| Issue | Check |
|-------|-------|
| Active buyer | Multiple purchases, each gets 8-K |
| Good track record | Press releases confirmed by 8-K within days |
| Dashboard available | kulrbitcointracker.com |

**Track record**: 5/5 press releases confirmed by SEC

### SBET (SharpLink)
| Issue | Check |
|-------|-------|
| ETH not BTC | Different asset class |
| Dashboard available | sharplink.com/eth-dashboard |
| Basic shares only | No diluted count published |

### Foreign Companies (General)
| Ticker | Exchange | Currency | Filing System |
|--------|----------|----------|---------------|
| 3350.T | Tokyo | JPY | EDINET |
| 0434.HK | Hong Kong | HKD | HKEX |
| H100.ST | Stockholm | SEK | Finansinspektionen |
| ALTBG | Paris | EUR | AMF |

**Always check**:
1. Is value in local currency or USD?
2. What exchange rate should be used?
3. Different disclosure schedules than US

---

## Field-Specific Patterns

### sharesOutstandingDiluted
| Pattern | Check |
|---------|-------|
| Basic vs diluted confusion | Search for "diluted" keyword |
| Stock splits | Check 8-K for split announcements |
| ATM dilution | Shares increase between 10-Qs |
| Dual-class | Sum all share classes |
| Options/warrants | Diluted includes these |

**SEC field name**: `WeightedAverageNumberOfDilutedSharesOutstanding`

### holdings
| Pattern | Check |
|---------|-------|
| Press release vs filing | Prefer 8-K over press release |
| Miners sell BTC | Holdings can decrease |
| Multiple assets | Company may hold BTC + ETH |
| Custody vs owned | Some report custodied assets |

### totalDebt
| Pattern | Check |
|---------|-------|
| Convertible notes | Include in total |
| Secured vs unsecured | Both count |
| Short-term vs long-term | Sum both |
| Note redemptions | Debt decreases with buybacks |

**Example**: MSTR reduced debt from $10B to $8.2B via note redemptions

### cashReserves
| Pattern | Check |
|---------|-------|
| Restricted vs free | Only free cash for mNAV |
| Post-offering cash | Increases after ATM/offering |
| Burns quickly | Tech companies burn cash |

**Formula**: freeCash = cashReserves - restrictedCash

---

## Aggregator Reliability

| Aggregator | Reliability | Known Issues |
|------------|-------------|--------------|
| strategy.com | HIGH | MSTR only |
| metaplanet.jp | HIGH | Metaplanet only |
| mNAV.com | MEDIUM | Missed XXI Class B, sometimes stale |
| BitcoinTreasuries.net | MEDIUM | Good for discovery, verify elsewhere |
| Yahoo Finance | MEDIUM | Market data OK, shares sometimes stale |
| CoinGecko | LOW | Not used for equity data |

**Rule**: Aggregators are TIER 3 - use for discovery, verify with TIER 1 source

---

## Red Flags

### Automatic rejection triggers
- [ ] Source is news article about a filing (find the actual filing)
- [ ] Number is "approximately" or "up to" (find exact number)
- [ ] Aggregator as only source
- [ ] No date on the source
- [ ] Value changed >50% with only TIER 2 evidence

### Escalation triggers
- [ ] Two TIER 1 sources disagree
- [ ] Company has history of restatements
- [ ] Value seems implausible given company size
- [ ] New company with no track record
- [ ] Foreign company with unfamiliar filing system

---

## Adding New Patterns

When a new mistake is caught, add it here:

```markdown
### [Company/Field] [Brief Description]
**Date**: YYYY-MM-DD
**Error**: What went wrong
**Root cause**: Why it happened
**Prevention**: How to avoid in future
```

This database is the institutional memory of the adversarial review process.
