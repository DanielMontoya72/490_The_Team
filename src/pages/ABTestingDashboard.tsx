import React, { useEffect } from 'react';
import { AppNav } from '@/components/layout/AppNav';
import { MaterialABTestDashboard } from '@/components/ab-testing/MaterialABTestDashboard';

export default function ABTestingDashboard() {
  useEffect(() => {
    document.title = 'A/B Testing Dashboard | The Team';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-8">
        <MaterialABTestDashboard />
      </main>
    </div>
  );
}
