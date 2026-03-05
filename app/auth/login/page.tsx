'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <Card glass className="w-full max-w-md relative z-10 border-primary/20 shadow-glow-soft">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-medium tracking-tight text-foreground dark:text-white text-center">
            Sign In
          </CardTitle>
          <CardDescription className="text-muted-foreground text-center text-base">
            Access your AI Business OS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-secondary-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="founder@mindall.ai"
                className="bg-background/50 border-border/50 focus:neon-border"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-primary hover:text-soft-accent transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-background/50 border-border/50 focus:neon-border"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full text-base font-semibold py-6 transition-all duration-300" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In to Brain'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              New to the future of business?{' '}
              <Link href="/auth/register" className="text-primary font-medium hover:text-soft-accent hover:underline transition-all">
                Create an Account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
