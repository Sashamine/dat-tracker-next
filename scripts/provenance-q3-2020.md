# Q3 2020 MSTR Bitcoin Reconciliation

**Period:** July 1, 2020 - September 30, 2020  
**Status:** ✅ RECONCILED

## 10-Q Cumulative Holdings (as of Sep 30, 2020)

| Metric | Value | Source |
|--------|-------|--------|
| Total BTC | 38,250 | 10-Q |
| Total Cost | $425.0 million | 10-Q |
| Average Price | ~$11,111/BTC | 10-Q |
| Carrying Value | $380.8 million | 10-Q |
| Cumulative Impairment | $44.2 million | 10-Q |

**XBRL Citation:**
- Element: `mstr:NumberOfBitcoinsPurchased`
- Element ID: `F_000770`
- Context: `C_0001050446_20200701_20200930`
- File: `10q/10-Q-2020-10-27.html`

## 8-K Purchase Announcements

### Purchase #1: August 11, 2020
| Metric | Value |
|--------|-------|
| BTC Purchased | 21,454 |
| Cost | $250.0 million |
| Average Price | ~$11,653/BTC |

**File:** `8k/8k-2020-08-11-215604.html`  
**Anchor:** `#dat-btc-holdings`  
**Text:** "On August 11, 2020, MicroStrategy Incorporated... issued a press release announcing that the Company has purchased 21,454 bitcoins at an aggregate purchase price of $250.0 million, inclusive of fees and expenses"

### Treasury Policy Announcement: September 14, 2020
| Metric | Value |
|--------|-------|
| Event | Board adopts Treasury Reserve Policy |
| Primary Reserve Asset | Bitcoin |

**File:** `8k/8k-2020-09-14-244732.html`  
**Anchor:** `#dat-btc-holdings`  
**Note:** This 8-K announces policy change, not a purchase. Anchored for completeness as it references the Aug 11 $250M investment.

### Purchase #2: September 14, 2020
| Metric | Value |
|--------|-------|
| BTC Purchased | 16,796 |
| Cost | $175.0 million |
| Average Price | ~$10,419/BTC |

**File:** `8k/8k-2020-09-15-245835.html`  
**Anchor:** `#dat-btc-holdings`  
**Text:** "On September 14, 2020, the Company completed its acquisition of 16,796 additional bitcoins at an aggregate purchase price of $175 million, inclusive of fees and expenses. To date, the Company has purchased a total of 38,250 bitcoins at an aggregate purchase price of $425 million"

## Reconciliation Math

```
Starting Balance (Jun 30, 2020):     0 BTC
+ 8-K Aug 11 purchase:          21,454 BTC
+ 8-K Sep 14 purchase:          16,796 BTC
─────────────────────────────────────────
Calculated Total:               38,250 BTC

10-Q Reported Total:            38,250 BTC

Difference:                          0 BTC ✅
```

**Cost Reconciliation:**
```
8-K Aug 11:    $250.0 million
8-K Sep 14:    $175.0 million
─────────────────────────────
Total:         $425.0 million

10-Q Reported: $425.0 million ✅
```

## Files Modified with Citation Anchors

| File | Anchor Added | Content |
|------|--------------|---------|
| `8k/8k-2020-08-11-215604.html` | `id="dat-btc-holdings"` | First purchase: 21,454 BTC / $250M |
| `8k/8k-2020-09-14-244732.html` | `id="dat-btc-holdings"` | Treasury Reserve Policy adoption |
| `8k/8k-2020-09-15-245835.html` | `id="dat-btc-holdings"` | Second purchase: 16,796 BTC / $175M + cumulative total |

## Notes

1. **First BTC Quarter:** Q3 2020 is MicroStrategy's first quarter holding Bitcoin
2. **No prior balance:** Starting from 0 BTC, so all 8-K purchases should equal 10-Q cumulative
3. **Two purchase tranches:** 
   - Aug 11: 21,454 BTC @ avg $11,653
   - Sep 14: 16,796 BTC @ avg $10,419
4. **Impairment:** The $44.2M impairment reflects BTC price dropping below cost basis at some point during the quarter (range was $8,905.84 - $12,486.61)
5. **No sales:** Company did not sell any bitcoins during Q3 2020

---
*Generated: 2025-06-23*
