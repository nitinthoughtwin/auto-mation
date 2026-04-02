'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  User,
  Settings,
  Tv,
  CreditCard,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigation = (path: string) => {
    if (navigating) return;
    setNavigating(true);
    setDropdownOpen(false);
    router.push(path);
    setTimeout(() => setNavigating(false), 100);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut({ callbackUrl: '/login' });
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Billing', href: '/billing', icon: CreditCard },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  const isLandingPage = pathname === '/';
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-28 bg-muted animate-pulse rounded hidden sm:block" />
          </div>
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  // Landing page has its own header
  if (isLandingPage && status !== 'authenticated') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href={status === 'authenticated' ? '/dashboard' : '/'}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Tv className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-base hidden sm:block">GPMart Studio</span>
        </Link>

        {/* Desktop Navigation - authenticated only */}
        {status === 'authenticated' && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 2).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {status === 'authenticated' && session?.user ? (
            /* User Avatar + Dropdown (visible on both mobile and desktop) */
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                    <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                      {session.user.name?.charAt(0).toUpperCase() ||
                        session.user.email?.charAt(0).toUpperCase() ||
                        'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden md:block max-w-[100px] truncate">
                    {session.user.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleNavigation(item.href);
                    }}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : status === 'loading' ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : (
            !isAuthPage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="hidden sm:inline-flex h-9"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/signup')}
                  className="gradient-primary gradient-primary-hover text-white shadow-md shadow-primary/25 h-9"
                >
                  Get Started
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
