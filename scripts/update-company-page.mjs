// Script to update company page to use database API
import fs from 'fs';

const content = fs.readFileSync('src/app/company/[ticker]/page.tsx', 'utf8');

let updated = content;

// Update imports
updated = updated.replace(
  'import { getCompanyByTicker } from "@/lib/data/companies";',
  'import { useCompany } from "@/lib/hooks/use-companies";'
);

// Update the company fetching logic
updated = updated.replace(
  `const params = useParams();
  const ticker = params.ticker as string;
  const baseCompany = getCompanyByTicker(ticker);
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();

  // Merge with overrides from Google Sheets
  const company = useMemo(
    () => baseCompany ? mergeCompanyWithOverrides(baseCompany, overrides) : null,
    [baseCompany, overrides]
  );`,
  `const params = useParams();
  const ticker = params.ticker as string;
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();

  // Fetch company from database API
  const { data: companyData, isLoading: isLoadingCompany } = useCompany(ticker);

  // Merge with overrides from Google Sheets
  const company = useMemo(
    () => companyData?.company ? mergeCompanyWithOverrides(companyData.company, overrides) : null,
    [companyData, overrides]
  );`
);

// Update the not found check to include loading state
updated = updated.replace(
  `if (!company) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Company not found
          </h1>`,
  `if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Company not found
          </h1>`
);

fs.writeFileSync('src/app/company/[ticker]/page.tsx', updated);
console.log('Updated company page successfully');
