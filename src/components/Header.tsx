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
import { LogOut, User, Settings, Youtube } from 'lucide-react';

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0" />
          <span className="font-bold text-base sm:text-lg truncate">Video Automation</span>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {status === 'authenticated' && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-10 sm:h-9 sm:w-9 rounded-full touch-manipulation"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 sm:w-64" 
                align="end" 
                forceMount
                sideOffset={5}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <div className="flex items-center min-h-[44px]">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <div className="flex items-center min-h-[44px]">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-red-600 focus:text-red-600 cursor-pointer min-h-[44px]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : status === 'unauthenticated' ? (
            <Button 
              variant="default" 
              onClick={() => window.location.href = '/login'}
              className="h-10 sm:h-9 touch-manipulation"
            >
              Sign In
            </Button>
          ) : (
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-muted animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}