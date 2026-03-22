'use client';

import { QueryClient, QueryClientProvider as Provider } from '@tanstack/react-query';
import React, { useState } from 'react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => queryClient);
  
  return <Provider client={client}>{children}</Provider>;
}
