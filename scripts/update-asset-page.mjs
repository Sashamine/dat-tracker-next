// Script to update asset page to use database API
import fs from 'fs';

const content = fs.readFileSync('src/app/asset/[symbol]/page.tsx', 'utf8');

let updated = content;

// Update imports
updated = updated.replace(
  'import { getCompaniesByAsset, allCompanies } from "@/lib/data/companies";',
  'import { useAsset, useAssets } from "@/lib/hooks/use-companies";'
);

// Update the hook usage - replace baseCompanies with API hook
updated = updated.replace(
  `const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();
  const baseCompanies = getCompaniesByAsset(symbol);
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();
  const [sortField, setSortField] = useState<string>("holdingsValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Merge with overrides from Google Sheets
  const companies = useMemo(
    () => mergeAllCompanies(baseCompanies, overrides),
    [baseCompanies, overrides]
  );`,
  `const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();
  const { data: prices } = usePricesStream();
  const { overrides } = useCompanyOverrides();
  const [sortField, setSortField] = useState<string>("holdingsValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch asset data from database API
  const { data: assetData, isLoading: isLoadingAsset } = useAsset(symbol);
  const { data: assetsData } = useAssets();

  // Merge with overrides from Google Sheets
  const companies = useMemo(
    () => mergeAllCompanies(assetData?.companies || [], overrides),
    [assetData, overrides]
  );`
);

// Update the allAssets reference
updated = updated.replace(
  '// Get all unique assets for navigation\n  const allAssets = [...new Set(allCompanies.map(c => c.asset))];',
  '// Get all unique assets for navigation\n  const allAssets = assetsData?.assets?.map((a: any) => a.symbol) || [];'
);

// Update the not found check
updated = updated.replace(
  `const assetInfo = ASSET_INFO[symbol];

  if (!assetInfo || companies.length === 0) {`,
  `const assetInfo = ASSET_INFO[symbol];

  if (isLoadingAsset) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading asset data...</p>
        </div>
      </div>
    );
  }

  if (!assetInfo || companies.length === 0) {`
);

fs.writeFileSync('src/app/asset/[symbol]/page.tsx', updated);
console.log('Updated asset page successfully');
