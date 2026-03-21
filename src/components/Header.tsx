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
import { LogOut, User, Settings, Youtube, CreditCard, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigation = (path: string) => {
    if (navigating) return;
    setNavigating(true);
    setDropdownOpen(false);
    // Use setTimeout to ensure dropdown closes before navigation
    setTimeout(() => {
      router.push(path);
      setNavigating(false);
    }, 100);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut({ callbackUrl: '/login' });
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
            <span className="font-bold text-base sm:text-lg truncate">GPMart Studio</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
        {/* Logo */}
        <div
          className="flex items-center gap-2 min-w-0 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
          <span className="font-bold text-base sm:text-lg truncate">GPMart Studio</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {status === 'authenticated' && session?.user ? (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative h-10 w-10 rounded-full touch-manipulation flex items-center justify-center hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all bg-primary text-primary-foreground font-medium text-lg"
                  aria-label="User menu"
                >
                  {session.user.image ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span>{session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 sm:w-64"
                align="end"
                sideOffset={5}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{session.user.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNavigation('/profile');
                  }} 
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNavigation('/billing');
                  }} 
                  className="cursor-pointer"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    handleNavigation('/settings');
                  }} 
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }} 
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : status === 'loading' ? (
            <button
              type="button"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              disabled
            >
              <Loader2 className="h-5 w-5 animate-spin" />
            </button>
          ) : (
            <Button
              variant="default"
              onClick={() => router.push('/login')}
              className="h-10 sm:h-9 touch-manipulation"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
