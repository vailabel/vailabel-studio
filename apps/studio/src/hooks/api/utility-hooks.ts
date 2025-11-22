/**
 * Utility Hooks
 * Utility React Query hooks
 */

import { useQuery } from "react-query"
import { apiClient } from "../api-client-config"

export function useServerStatus() {
  return useQuery({
    queryKey: ["server", "status"],
    queryFn: () => apiClient.healthCheck(),
    refetchInterval: 30 * 1000, // Check every 30 seconds
    staleTime: 10 * 1000, // 10 seconds
  })
}
