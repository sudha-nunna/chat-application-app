import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Custom React Query wrapper handling disk persistence automatically
 */
export function useTanStackData(queryKey, fetchFn, options = {}) {
  const queryClient = useQueryClient();
  const { persistKey, ...queryOptions } = options;

  const queryKeyString = JSON.stringify(queryKey);

  // Load initial data from persistence asynchronously
  useEffect(() => {
    let isMounted = true;

    if (persistKey) {
      const loadLocalData = async () => {
        try {
          const existingData = queryClient.getQueryData(queryKey);
          // Only load from disk if cache is empty
          if (!existingData) {
            const localData = await localDataService.getData(persistKey);
            if (localData && isMounted) {
              // Set data without triggering a background fetch immediately (let useQuery handle that)
              queryClient.setQueryData(queryKey, localData);
            }
          }
        } catch (error) {
          console.error("Error loading persisted data", error);
        }
      };
      loadLocalData();
    }

    return () => {
      isMounted = false;
    };
  }, [persistKey, queryKeyString, queryClient]);

  // Pro-Grade: Cross-Window Synchronization Listener


  return useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchFn();

      // Check ONLY null or undefined
      if (res === null || res === undefined) {
        throw new Error("Failed to fetch data");
      }

      // Save to disk if persistKey is provided
      if (persistKey) {
        localDataService
          .saveData(persistKey, res)
          .catch((e) => console.error("Persistence save error", e));
      }

      return res;
    },

    onError: (error) => {
    },
    retry: 1, // Retry twice on failure
    staleTime: 60000, // 1 minute default stale time
    gcTime: 300000, // 5 minutes default garbage collection (Hot data)
    refetchOnMount: true, // Ensure fresh data on mount if needed
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev, // Keep previous data during background refetches
    ...queryOptions,
  });
}

/**
 * Custom Infinite Query wrapping pagination features
 */
export function useTanStackInfiniteData(queryKey, fetchFn, options = {}) {
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetchFn(pageParam);
      if (res === null || res === undefined) {
        throw new Error("Failed to fetch data");
      }
      return res;
    },
    getNextPageParam: (lastPage, allPages) => {
      const PAGE_SIZE = 20;
      if (!lastPage.success || lastPage.success.length < PAGE_SIZE) {
        return undefined;
      }
      return allPages.length * PAGE_SIZE;
    },
    onError: (error) => {
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Custom Mutation wrapper for TanStack Query
 */
export function useTanStackMutation(options) {
  return useMutation(options);
}

/**
 * Custom QueryClient hook for TanStack Query
 */
export function useTanStackQueryClient() {
  return useQueryClient();
}