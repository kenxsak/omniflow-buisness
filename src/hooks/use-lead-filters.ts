import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export interface LeadFilters {
  searchTerm: string;
  filterByUserId: string;
  currentPage: number;
  leadsPerPage: number;
}

export function useLeadFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchTerm = searchParams.get('search') || '';
  const filterByUserId = searchParams.get('user') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const leadsPerPage = parseInt(searchParams.get('perPage') || '10', 10);

  const updateFilters = useCallback(
    (updates: Partial<LeadFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.searchTerm !== undefined) {
        if (updates.searchTerm) {
          params.set('search', updates.searchTerm);
        } else {
          params.delete('search');
        }
        params.set('page', '1');
      }

      if (updates.filterByUserId !== undefined) {
        if (updates.filterByUserId && updates.filterByUserId !== 'all') {
          params.set('user', updates.filterByUserId);
        } else {
          params.delete('user');
        }
        params.set('page', '1');
      }

      if (updates.currentPage !== undefined) {
        params.set('page', updates.currentPage.toString());
      }

      if (updates.leadsPerPage !== undefined) {
        params.set('perPage', updates.leadsPerPage.toString());
        params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const setSearchTerm = useCallback(
    (searchTerm: string) => updateFilters({ searchTerm }),
    [updateFilters]
  );

  const setFilterByUserId = useCallback(
    (filterByUserId: string) => updateFilters({ filterByUserId }),
    [updateFilters]
  );

  const setCurrentPage = useCallback(
    (currentPage: number) => updateFilters({ currentPage }),
    [updateFilters]
  );

  const setLeadsPerPage = useCallback(
    (leadsPerPage: number) => updateFilters({ leadsPerPage }),
    [updateFilters]
  );

  return {
    searchTerm,
    filterByUserId,
    currentPage,
    leadsPerPage,
    setSearchTerm,
    setFilterByUserId,
    setCurrentPage,
    setLeadsPerPage,
    updateFilters,
  };
}
