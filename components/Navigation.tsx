'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Menu, 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  ListTodo, 
  Building2, 
  LogOut,
  BrainCircuit,
  Settings,
  Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Strategy Room', href: '/chat', icon: MessageSquare },
  { label: '90-Day Roadmap', href: '/roadmap', icon: Map },
  { label: 'Knowledge Vault', href: '/vault', icon: Database },
  { label: 'Execution Board', href: '/tasks', icon: ListTodo },
  { label: 'Company Profile', href: '/company', icon: Building2 },
];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, getCurrentUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Initialize user if not present
  useState(() => {
    if (!user) {
      getCurrentUser().catch(() => {});
    }
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : '?');

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-1.5 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            onClick={onClick}
            className={cn(
              'w-full justify-start gap-3 h-10 px-3 rounded-none transition-all duration-300 relative group overflow-hidden',
              isActive
                ? 'bg-primary/10 text-primary font-medium shadow-glow-soft border border-primary/20'
                : 'text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground border border-transparent'
            )}
          >
            <Link href={item.href}>
              <item.icon className={cn("h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary drop-shadow-[0_0_8px_#2FD3FF]" : "text-muted-foreground")} aria-hidden="true" />
              <span className="relative z-10 text-sm">{item.label}</span>
              {isActive && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary rounded-none shadow-[0_0_10px_#2FD3FF]" />
              )}
            </Link>
          </Button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/80 backdrop-blur-xl h-screen sticky top-0 overflow-hidden shadow-xl shrink-0">
        {/* Compact Logo Header */}
        <div className="h-16 px-5 flex items-center border-b border-border/30 mb-4 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center transition-all group"
          >
            <div className="relative w-32 h-8 group-hover:scale-105 transition-transform duration-300">
              <Image 
                src="/MindAll logo.png" 
                alt="MindAll Logo" 
                fill
                className="object-contain object-left drop-shadow-[0_0_8px_rgba(47,211,255,0.4)]"
                priority
              />
            </div>
          </Link>
        </div>

        <div className="flex-1 py-2 overflow-y-auto scrollbar-none">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-border/30 space-y-4 bg-background/20 mt-auto shrink-0">
          <div className="flex items-center justify-between px-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">Preferences</span>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-14 p-2 rounded-none transition-all hover:bg-primary/5 border border-transparent hover:border-primary/20 group">
                <Avatar className="h-9 w-9 border border-border group-hover:border-primary/40 transition-all shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <p className="text-xs font-medium leading-none truncate w-full text-foreground dark:text-white">
                    {user?.name || user?.email?.split('@')[0] || 'Founder'}
                  </p>
                  <p className="text-[9px] leading-none text-muted-foreground mt-1 truncate w-full opacity-70">
                    {user?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 mb-4 bg-card/95 backdrop-blur-md border-border/50" align="start" sideOffset={10} forceMount>
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-2">
                  <p className="text-base font-medium leading-none text-foreground dark:text-white">{user?.name || user?.email?.split('@')[0] || 'Founder'}</p>
                  <p className="text-xs leading-none text-muted-foreground opacity-70">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem asChild className="cursor-pointer gap-3 p-3 focus:bg-primary/10 focus:text-primary transition-colors">
                <Link href="/profile" className="flex items-center w-full">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer gap-3 p-3 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background/90 backdrop-blur-xl sticky top-0 z-40 w-full h-16">
        <Link
          href="/dashboard"
          className="flex items-center group"
        >
          <div className="relative w-32 h-8 group-hover:scale-105 transition-transform duration-300">
            <Image 
              src="/MindAll logo.png" 
              alt="MindAll Logo" 
              fill
              className="object-contain object-left drop-shadow-[0_0_8px_rgba(47,211,255,0.4)]"
            />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-card border-r border-border/50">
              <SheetHeader className="h-16 px-8 border-b border-border/30 text-left flex items-center flex-row">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center w-full"
                >
                  <div className="relative w-32 h-8">
                    <Image 
                      src="/MindAll logo.png" 
                      alt="MindAll Logo" 
                      fill
                      className="object-contain object-left drop-shadow-[0_0_8px_rgba(47,211,255,0.4)]"
                    />
                  </div>
                </Link>
              </SheetHeader>

              <div className="flex-1 py-6 overflow-y-auto">
                <NavLinks onClick={() => setIsOpen(false)} />
              </div>

              <div className="p-8 border-t border-border/30 bg-background/20">
                <div className="flex items-center gap-4 mb-8">
                  <Avatar className="h-12 w-12 border border-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary text-base font-medium">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-base font-medium leading-none truncate text-foreground dark:text-white">
                      {user?.name || user?.email?.split('@')[0] || 'Founder'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate opacity-70">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button
                    asChild
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="w-full justify-start gap-4 h-12 rounded-none text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Link href="/profile">
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    disabled={isLoggingOut}
                    className="w-full justify-start gap-4 h-12 rounded-none text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}

