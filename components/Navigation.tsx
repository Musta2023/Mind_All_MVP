'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
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
  User as UserIcon, 
  LogOut,
  BrainCircuit,
  Settings,
  Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
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
    <div className="flex flex-col gap-1 px-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            onClick={onClick}
            className={cn(
              'w-full justify-start gap-3 h-11 px-4 transition-all duration-200',
              isActive
                ? 'bg-violet-600/10 text-violet-600 font-bold hover:bg-violet-600/15'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Link href={item.href}>
              <item.icon className={cn("h-5 w-5", isActive ? "text-violet-600" : "text-muted-foreground")} aria-hidden="true" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0 overflow-hidden shadow-sm shrink-0">
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-2xl font-black text-foreground hover:opacity-80 transition-opacity"
          >
            <div className="p-1.5 bg-violet-600 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span>MindAll</span>
          </Link>
        </div>

        <div className="flex-1 py-4">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-border space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Appearance</span>
            <ThemeToggle />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-14 p-2 rounded-xl transition-all hover:bg-accent/50 group">
                <Avatar className="h-9 w-9 border border-border group-hover:border-primary/20 transition-all">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <p className="text-sm font-bold leading-none truncate w-full">
                    {user?.name || user?.email?.split('@')[0] || 'Founder'}
                  </p>
                  <p className="text-[10px] leading-none text-muted-foreground mt-1 truncate w-full">
                    {user?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="start" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none">{user?.name || user?.email?.split('@')[0] || 'Founder'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href="/profile">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive cursor-pointer gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 w-full">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xl font-black text-foreground"
        >
          <div className="p-1 bg-violet-600 rounded-md">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span>MindAll</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] p-0 flex flex-col bg-card border-r border-border">
              <SheetHeader className="p-6 border-b border-border text-left">
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 text-2xl font-black text-foreground"
                  >
                    <div className="p-1.5 bg-violet-600 rounded-lg">
                      <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span>MindAll</span>
                  </Link>
                </div>
              </SheetHeader>

              <div className="flex-1 py-6 overflow-y-auto">
                <NavLinks onClick={() => setIsOpen(false)} />
              </div>

              <div className="p-6 border-t border-border">
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-bold leading-none truncate">
                      {user?.name || user?.email?.split('@')[0] || 'Founder'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="w-full justify-start gap-3 h-11 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
                    className="w-full justify-start gap-3 h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
