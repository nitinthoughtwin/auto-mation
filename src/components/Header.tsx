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
import { LogOut, User, Settings, Youtube, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    router.push('/jn,];\
        .');
  };

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    router.push('/settings');
  };

  const handleBillingClick = () => {
    setDropdownOpen(false);
    router.push('/billing');
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut({ callbackUrl: '/login' });
  };

  console.log('---Session status:', status, session);
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
                  className="relative h-10 w-10 sm:h-10 sm:w-10 rounded-full touch-manipulation flex items-center justify-center hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 sm:h-9 sm:w-9">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 sm:w-64" 
                align="end"
                sideOffset={5}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBillingClick} className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : status === 'unauthenticated' ? (
            <Button 
              variant="default" 
              onClick={() => router.push('/login')}
              className="h-10 sm:h-9 touch-manipulation"
            >
              Sign In
            </Button>
          ) : (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
