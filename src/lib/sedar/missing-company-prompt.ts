import type { CanadianCompany } from './canadian-companies';

export function sedarMissingCompanyPrompt(params: {
  ticker: string;
  companyNameHint?: string;
  exchangeHint?: string;
}): string {
  const ticker = params.ticker.toUpperCase();
  const name = params.companyNameHint || 'UNKNOWN COMPANY NAME';
  const exchange = params.exchangeHint || 'TSX-V';

  const template: CanadianCompany = {
    ticker,
    localTicker: 'UNKNOWN',
    name,
    sedarProfileNumber: '000000000',
    exchange,
    asset: 'BTC',
    fiscalYearEnd: 'December',
  };

  return [
    `Ticker ${ticker} is not in CANADIAN_COMPANIES (SEDAR monitoring list).`,
    '',
    'Add an entry to: src/lib/sedar/canadian-companies.ts',
    'Then re-run the script.',
    '',
    'Suggested snippet (fill in localTicker/name/profileNumber/etc):',
    '```ts',
    JSON.stringify(template, null, 2)
      .replace(/"(\w+)":/g, '$1:')
      .replace(/"/g, '"')
      .replace(/\n/g, '\n'),
    '```',
    '',
    'How to find profile number:',
    '- Go to sedarplus.ca → Search SEDAR+ → Profiles → search company name, copy profile number.',
  ].join('\n');
}
