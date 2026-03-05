'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    startupName: '',
    stage: 'idea',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(
        formData.email,
        formData.password,
        formData.startupName,
        formData.stage,
        formData.name,
      );
      router.push('/auth/onboarding');
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />

      <Card glass className="w-full max-w-md relative z-10 border-primary/20 shadow-glow-soft">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-xl font-medium tracking-tight text-foreground dark:text-white">Create Account</CardTitle>
          <CardDescription className="text-muted-foreground text-base">Join the future of business intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground dark:text-white">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="bg-background/50 border-border focus:neon-border"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground dark:text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="founder@mindall.ai"
                className="bg-background/50 border-border focus:neon-border"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="Minimum 8 characters" className="text-foreground dark:text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-background/50 border-border focus:neon-border"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startupName" className="text-foreground dark:text-white">Startup Name</Label>
              <Input
                id="startupName"
                placeholder="Your company name"
                className="bg-background/50 border-border focus:neon-border"
                value={formData.startupName}
                onChange={(e) =>
                  setFormData({ ...formData, startupName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage" className="text-foreground dark:text-white">Startup Stage</Label>
              <Select value={formData.stage} onValueChange={(value) =>
                setFormData({ ...formData, stage: value })
              }>
                <SelectTrigger id="stage" className="bg-background/50 border-border focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series-a">Series A</SelectItem>
                  <SelectItem value="series-b">Series B+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full text-base font-medium py-6 shadow-glow-primary transition-all duration-300" disabled={loading}>
              {loading ? 'Initializing Neural Link...' : 'Create Strategic Account'}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-medium hover:text-soft-accent hover:underline transition-all">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
