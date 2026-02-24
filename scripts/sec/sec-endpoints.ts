export function normalizeCik(cik: string | number): string {
  const s = String(cik).replace(/^CIK/i, '').replace(/\D/g, '');
  return s.padStart(10, '0');
}

export function submissionsUrl(cik: string | number) {
  return `https://data.sec.gov/submissions/CIK${normalizeCik(cik)}.json`;
}

export function companyFactsUrl(cik: string | number) {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${normalizeCik(cik)}.json`;
}

export function archiveAccessionDirUrl(cik: string | number, accessionNoDashes: string) {
  const cikDigits = String(cik).replace(/\D/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accessionNoDashes}/`;
}
