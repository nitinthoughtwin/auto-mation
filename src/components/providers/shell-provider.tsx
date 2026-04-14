'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

// Routes where Header and BottomNav should be hidden
const SHELL_HIDDEN_ROUTES = ['/lp'];

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideShell = SHELL_HIDDEN_ROUTES.some(route => pathname.startsWith(route));

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto max-w-7xl pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
