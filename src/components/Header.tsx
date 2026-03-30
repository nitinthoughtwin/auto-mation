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
  Youtube,
  CreditCard,
  Loader2,
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleNavigation = (path: string) => {
    if (navigating) return;
    setNavigating(true);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push(path);
    setTimeout(() => setNavigating(false), 100);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    signOut({ callbackUrl: '/login' });
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Billing', href: '/billing', icon: CreditCard },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  const isLandingPage = pathname === '/';
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  // Landing page header (transparent, minimal)
  if (isLandingPage && status !== 'authenticated') {
    return null; // Landing page has its own header
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href={status === 'authenticated' ? '/dashboard' : '/'}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Youtube className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:block">GPMart Studio</span>
        </Link>

        {/* Desktop Navigation - Only show for authenticated users */}
        {status === 'authenticated' && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 2).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
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
        <div className="flex items-center gap-2 sm:gap-3">
          {status === 'authenticated' && session?.user ? (
            <>
              {/* Desktop User Menu */}
              <div className="hidden sm:block">
                <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                        <AvatarFallback className="gradient-primary text-white text-sm font-semibold">
                          {session.user.name?.charAt(0).toUpperCase() ||
                            session.user.email?.charAt(0).toUpperCase() ||
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
                        {session.user.name?.split(' ')[0] || 'User'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
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
              </div>

              {/* Mobile Menu Button */}
              <button
                className="sm:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : status === 'loading' ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : (
            // Auth buttons for non-authenticated users
            <div className="flex items-center gap-2">
              {!isAuthPage && (
                <>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => router.push('/login')}
                    className="hidden sm:inline-flex"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => router.push('/signup')}
                    className="gradient-primary gradient-primary-hover text-white shadow-lg shadow-primary/25"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && status === 'authenticated' && (
        <div className="sm:hidden border-t border-border/50 bg-background animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-border/50 mt-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}