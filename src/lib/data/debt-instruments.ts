import { DebtInstrument } from "@/lib/types";

/**
 * Global registry of debt instruments.
 * Tracks maturity, coupon rates, and face value for liquidity analysis.
 */
export const debtInstruments: Record<string, DebtInstrument[]> = {
  // MicroStrategy (MSTR) - The benchmark for debt laddering
  // Source: SEC 10-Q Q3 2025 Note 5 + 8-K filings
  MSTR: [
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2027-02-15",
      couponRate: 0,
      faceValue: 1_050_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0% Convertible Senior Notes due 2027 (2027 Notes)",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2028-09-15",
      couponRate: 0.00625,
      faceValue: 1_010_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0.625% Convertible Senior Notes due 2028 (2028 Notes)",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2029-12-01",
      couponRate: 0,
      faceValue: 3_000_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0% Convertible Senior Notes due 2029 (2029 Notes)",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2030-03-15",
      couponRate: 0.00625,
      faceValue: 800_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0.625% Convertible Senior Notes due 2030 (2030A Notes)",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2030-03-01",
      couponRate: 0,
      faceValue: 2_000_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0% Convertible Senior Notes due 2030 (2030B Notes)",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2031-03-15",
      couponRate: 0.00875,
      faceValue: 603_750_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "0.875% Convertible Senior Notes due 2031",
    },
    {
      ticker: "MSTR",
      type: "convertible",
      maturityDate: "2032-06-15",
      couponRate: 0.0225,
      faceValue: 800_000_000,
      source: "10-Q Q3 2025 Note 5",
      sourceUrl: "/filings/mstr/0001193125-25-262568",
      notes: "2.25% Convertible Senior Notes due 2032",
    },
  ],

  // MARA Holdings (MARA)
  // Source: SEC 10-Q Q3 2025 Note 14
  MARA: [
    {
      ticker: "MARA",
      type: "convertible",
      maturityDate: "2026-12-01",
      couponRate: 0.01,
      faceValue: 48_077_000,
      source: "10-Q Q3 2025 Note 14",
      sourceUrl: "/filings/mara/0001507605-25-000028",
      notes: "1.0% Convertible Senior Notes due 2026",
    },
    {
      ticker: "MARA",
      type: "convertible",
      maturityDate: "2030-03-01",
      couponRate: 0,
      faceValue: 1_000_000_000,
      source: "10-Q Q3 2025 Note 14",
      sourceUrl: "/filings/mara/0001507605-25-000028",
      notes: "0% Convertible Senior Notes due 2030",
    },
    {
      ticker: "MARA",
      type: "convertible",
      maturityDate: "2031-09-01",
      couponRate: 0.02125,
      faceValue: 300_000_000,
      source: "10-Q Q3 2025 Note 14",
      sourceUrl: "/filings/mara/0001507605-25-000028",
      notes: "2.125% Convertible Senior Notes due 2031",
    },
    {
      ticker: "MARA",
      type: "convertible",
      maturityDate: "2031-06-01",
      couponRate: 0,
      faceValue: 925_000_000,
      source: "10-Q Q3 2025 Note 14",
      sourceUrl: "/filings/mara/0001507605-25-000028",
      notes: "0% Convertible Senior Notes due 2031 (Jun Notes)",
    },
    {
      ticker: "MARA",
      type: "convertible",
      maturityDate: "2032-08-01",
      couponRate: 0,
      faceValue: 1_025_000_000,
      source: "10-Q Q3 2025 Note 14",
      sourceUrl: "/filings/mara/0001507605-25-000028",
      notes: "0% Convertible Senior Notes due 2032",
    },
  ],
};
