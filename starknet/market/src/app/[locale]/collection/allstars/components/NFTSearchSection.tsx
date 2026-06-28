"use client";

import React, { useState, useCallback, startTransition } from "react";
import { SearchBar } from "./SearchBar";
import { useDebounce } from "../hooks/useDebounce";

interface NFTSearchSectionProps {
  isLoading: boolean;
  onSearch: (term: string) => void;
  sortControls?: React.ReactNode;
}

export function NFTSearchSection({
  isLoading,
  onSearch,
  sortControls,
}: NFTSearchSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchTerm(e.target.value);
      onSearch(e.target.value);
    });
  };

  const resetSearch = useCallback(() => {
    startTransition(() => {
      setSearchTerm("");
      onSearch("");
    });
  }, [onSearch]);

  const debouncedResetSearch = useDebounce(resetSearch, 300);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 sm:mb-6 md:mb-8">
      <div className="w-full sm:w-[300px]">
        <SearchBar
          value={searchTerm}
          onChange={handleSearchChange}
          onClear={debouncedResetSearch}
          isLoading={isLoading}
        />
      </div>
      {sortControls && (
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {sortControls}
        </div>
      )}
    </div>
  );
}
