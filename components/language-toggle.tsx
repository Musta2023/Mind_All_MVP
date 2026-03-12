'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { ApiClient } from '@/lib/api-client';

export function LanguageToggle() {
  const { user, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleLanguageChange = async (lang: string) => {
    if (user?.language === lang || isUpdating) return;

    try {
      setIsUpdating(true);
      await ApiClient.patch('/users/profile', { language: lang });
      updateUser({ language: lang });
    } catch (error) {
      console.error('Failed to update language:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none relative group" disabled={isUpdating}>
          <Languages className="h-[1.2rem] w-[1.2rem] transition-all group-hover:scale-110" />
          <span className="sr-only">Toggle language</span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground uppercase">
            {user?.language || 'en'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none bg-card/95 backdrop-blur-md border-border/50">
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('en')}
          className={user?.language === 'en' ? 'bg-primary/10 text-primary' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLanguageChange('fr')}
          className={user?.language === 'fr' ? 'bg-primary/10 text-primary' : ''}
        >
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
