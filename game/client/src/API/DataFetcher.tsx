import { fetchAndProcessData } from "./initDataFetch";
import { useQuery } from "@tanstack/react-query";

export const useDataFetcher = () => {
  useQuery<boolean, Error>({
    queryKey: ["gameData"],
    queryFn: fetchAndProcessData,
    staleTime: Infinity, // Data is always considered fresh
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });
};
