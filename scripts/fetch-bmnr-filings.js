// Script to fetch BMNR 8-K filings via browser and save locally
// This is a reference - we'll do it manually through the browser

const BMNR_FILINGS = [
  { date: "2025-07-17", holdings: 300657, accession: "000149315225011270", file: "ex99-1.htm" },
  { date: "2025-08-10", holdings: 1150263, accession: "000149315225011799", file: "ex99-1.htm" },
  { date: "2025-08-17", holdings: 1523373, accession: "000149315225012109", file: "ex99-1.htm" },
  { date: "2025-08-24", holdings: 1713899, accession: "000149315225012292", file: "ex99-1.htm" },
  { date: "2025-09-07", holdings: 2069443, accession: "000149315225012776", file: "ex99-1.htm" },
  { date: "2025-11-09", holdings: 3505723, accession: "000149315225021429", file: "ex99-1.htm" },
  { date: "2025-11-20", holdings: 3559879, accession: "000149315225024555", file: "ex99-1.htm" },
  { date: "2025-11-30", holdings: 3726499, accession: "000149315225025501", file: "ex99-1.htm" },
  { date: "2025-12-14", holdings: 3967210, accession: "000149315225027660", file: "ex99-1.htm" },
  { date: "2025-12-28", holdings: 4110525, accession: "000149315225029227", file: "ex99-1.htm" },
  { date: "2026-01-04", holdings: 4143502, accession: "000149315226000274", file: "ex99-1.htm" },
  { date: "2026-01-20", holdings: 4203036, accession: "000149315226002762", file: "ex99-1.htm" },
  { date: "2026-01-25", holdings: 4243338, accession: "000149315226003536", file: "ex99-1.htm" },
  { date: "2026-02-01", holdings: 4285125, accession: "000149315226004658", file: "ex99-1.htm" },
];

// URL pattern: https://www.sec.gov/Archives/edgar/data/1829311/{accession}/{file}
// Local save pattern: data/sec/bmnr/8k/8-K-{date}.html

module.exports = { BMNR_FILINGS };
