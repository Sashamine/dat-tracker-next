// Hook to fetch companies from the database API
import { useQuery } from '@tanstack/react-query';
import { Company } from '../types';

interface CompaniesResponse {
  companies: Company[];
  count: number;
}

interface CompanyDetailResponse {
  company: Company;
  holdingsHistory: {
    date: string;
    holdings: number;
    sharesOutstanding: number | null;
    holdingsPerShare: number | null;
    source: string;
  }[];
}

// Fetch all companies
export function useCompanies(asset?: string, tier?: number) {
  return useQuery<CompaniesResponse>({
    queryKey: ['companies', asset, tier],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (asset) params.set('asset', asset);
      if (tier) params.set('tier', String(tier));

      const url = `/api/db/companies${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch companies');
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Fetch single company with holdings history
export function useCompany(ticker: string) {
  return useQuery<CompanyDetailResponse>({
    queryKey: ['company', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/db/companies/${ticker}`);
      if (!res.ok) throw new Error('Failed to fetch company');
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 30000,
  });
}

// Fetch holdings history for charts
export function useHoldingsHistory(ticker: string) {
  return useQuery({
    queryKey: ['holdings-history', ticker],
    queryFn: async () => {
      const res = await fetch(`/api/db/companies/${ticker}/holdings`);
      if (!res.ok) throw new Error('Failed to fetch holdings history');
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Fetch assets
export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const res = await fetch('/api/db/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
    staleTime: 60000,
  });
}

// Fetch single asset with companies
export function useAsset(symbol: string) {
  return useQuery({
    queryKey: ['asset', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/db/assets/${symbol}`);
      if (!res.ok) throw new Error('Failed to fetch asset');
      return res.json();
    },
    enabled: !!symbol,
    staleTime: 30000,
  });
}
