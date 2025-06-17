import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if we're using development bypass mode (only in development)
  const isDevelopment = import.meta.env.DEV;
  const isDevBypass = isDevelopment && localStorage.getItem('blupi_dev_bypass') === 'true';
  
  // Create headers object with dev bypass flag if needed
  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  if (isDevBypass) {
    headers['X-Dev-Bypass'] = 'true';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Important: Include credentials for session persistence
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check if we're using development bypass mode (only in development)
    const isDevelopment = import.meta.env.DEV;
    const isDevBypass = isDevelopment && localStorage.getItem('blupi_dev_bypass') === 'true';
    
    // Create headers object with dev bypass flag if needed
    const headers: Record<string, string> = {};
    if (isDevBypass) {
      headers['X-Dev-Bypass'] = 'true';
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include", // Important: Include credentials for session persistence
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 30000, // Data stays fresh for 30 seconds
      gcTime: 1800000, // Keep unused data in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true, // Refetch when component mounts
      retry: 1, // Only retry once
      retryDelay: 1000, // Wait 1 second between retries
    },
    mutations: {
      retry: false,
    },
  },
});