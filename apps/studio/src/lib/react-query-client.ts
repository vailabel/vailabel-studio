/**
 * React Query client configuration
 * Provides a configured QueryClient for the application
 */

import { QueryClient } from "react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
})

// Global error handler
queryClient.setMutationDefaults(["login"], {
  onError: (error) => {
    console.error("Login mutation error:", error)
  },
})

queryClient.setMutationDefaults(["logout"], {
  onError: (error) => {
    console.error("Logout mutation error:", error)
  },
})

export default queryClient
