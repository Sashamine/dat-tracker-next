// Script to update page.tsx to use database API
import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');

let updated = content;

// Update imports
updated = updated.replace(
  'import { allCompanies } from "@/lib/data/companies";',
  'import { useCompanies } from "@/lib/hooks/use-companies";\nimport { Company } from "@/lib/types";'
);

// Update getAssetStats type
updated = updated.replace(
  'function getAssetStats(companies: typeof allCompanies, prices: any)',
  'function getAssetStats(companies: Company[], prices: any)'
);

// Update the hook usage
updated = updated.replace(
  `const { overrides } = useCompanyOverrides();

  // Merge base company data with Google Sheets overrides
  const companies = useMemo(
    () => mergeAllCompanies(allCompanies, overrides),
    [overrides]
  );`,
  `const { overrides } = useCompanyOverrides();

  // Fetch companies from database API
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();

  // Merge database company data with Google Sheets overrides
  const companies = useMemo(() => {
    const baseCompanies = companiesData?.companies || [];
    return mergeAllCompanies(baseCompanies, overrides);
  }, [companiesData, overrides]);`
);

// Update subtitle to show loading state
updated = updated.replace(
  '{totalCompanies} companies · ${(totalValue / 1_000_000_000).toFixed(1)}B treasury',
  '{isLoadingCompanies ? "Loading..." : `${totalCompanies} companies · $${(totalValue / 1_000_000_000).toFixed(1)}B treasury`}'
);

// Update data table to show loading
updated = updated.replace(
  `<Suspense fallback={<div className="h-96 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />}>
                <DataTable companies={companies} prices={prices ?? undefined} />
              </Suspense>`,
  `{isLoadingCompanies ? (
                <div className="h-96 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse" />
              ) : (
                <DataTable companies={companies} prices={prices ?? undefined} />
              )}`
);

// Update footer
updated = updated.replace(
  'Real-time prices from Alpaca. Live streaming updates.',
  'Real-time prices from Alpaca. Data from Railway PostgreSQL.'
);

fs.writeFileSync('src/app/page.tsx', updated);
console.log('Updated page.tsx successfully');
