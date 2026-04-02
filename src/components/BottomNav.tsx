'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Settings, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Profile', href: '/profile', icon: User },
];

const hiddenPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];

export default function BottomNav() {
  const { status } = useSession();
  const pathname = usePathname();

  if (status !== 'authenticated') return null;
  if (hiddenPaths.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md pb-safe">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-150 active:scale-95 touch-manipulation',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-6 rounded-full transition-all duration-150',
                  isActive && 'bg-primary/10'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium leading-none',
                  isActive && 'font-semibold'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
