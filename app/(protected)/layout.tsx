'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, API_URL } from '@/lib/api-client';
import Navigation from '@/components/Navigation';
import { useStrategicStore } from '@/lib/store/use-strategic-store';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const updateVaultProgress = useStrategicStore(state => state.updateVaultProgress);
  const fetchDashboardData = useStrategicStore(state => state.fetchDashboardData);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }
      setMounted(true);
      
      // Initialize SSE for vault progress
      const setupSSE = async () => {
        const accessToken = await getAccessToken();
        const sseUrl = new URL('vault/progress', API_URL);
        sseUrl.searchParams.set('token', accessToken || '');
        const eventSource = new EventSource(sseUrl.toString());
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'COMPLETED') {
              updateVaultProgress(100, true);
              setTimeout(() => {
                updateVaultProgress(0, false);
                fetchDashboardData();
              }, 2000);
            } else if (data.status === 'FAILED') {
              updateVaultProgress(0, false);
            } else {
              updateVaultProgress(data.progress || 0, true);
            }
          } catch (e) {
            console.error('SSE Layout: Failed to parse message', e);
          }
        };

        return () => eventSource.close();
      };

      const cleanup = setupSSE();
      return () => {
        cleanup.then(fn => fn?.());
      };
    };

    checkAuth();
  }, [router, updateVaultProgress, fetchDashboardData]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      <Navigation />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
