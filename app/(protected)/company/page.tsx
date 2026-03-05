'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiClient } from '@/lib/api-client';
import {
  Building2,
  Target,
  TrendingUp,
  DollarSign,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 1. Strict TypeScript Interfaces
interface StartupProfile {
  id?: string;
  name?: string;
  description?: string;
  target?: string;
  competitiveEdge?: string;
  fundingRaised?: number;
  runway?: number;
  [key: string]: any; // Catch-all for extra DB fields like tenantId
}

export default function CompanyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [formData, setFormData] = useState<StartupProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await ApiClient.get('/startup/profile');
      setProfile(data);
      setFormData(data);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        router.push('/auth/onboarding');
      } else {
        setError('Failed to load company profile data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Safely destructure read-only fields
      const {
        id,
        tenantId,
        userId,
        createdAt,
        updatedAt,
        deletedAt,
        goals,
        ...updateData
      } = formData;

      await ApiClient.patch('/startup/profile', updateData);

      // Update baseline profile to match newly saved data
      setProfile({ ...profile, ...updateData });
      setFormData({ ...formData, ...updateData });

      // Trigger success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // 2. Compute "Dirty" state - only enable save if changes were made
  const hasChanges = JSON.stringify(profile) !== JSON.stringify(formData);

  return (
    <>
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-foreground dark:text-white">Company Profile</h1>
              <p className="text-muted-foreground mt-1 font-medium">Manage your company details and strategic positioning.</p>
            </div>
            {/* Top-level save button for quick access on long pages */}
            <div className="hidden md:block">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={cn(
                  "transition-all duration-300 w-32 font-medium shadow-glow-primary",
                  saveSuccess ? "bg-success text-success-foreground hover:bg-success/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</> : 'Save Changes'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading || !formData ? (
            /* Skeleton Loading State */
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} glass className="border-border shadow-sm">
                  <CardHeader><Skeleton className="h-6 w-48 mb-2 bg-muted/50" /><Skeleton className="h-4 w-64 bg-muted/50" /></CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-xl bg-muted/50" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Forms - Grouped into logical sections */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">

              {/* Card 1: Core Identity */}
              <Card glass className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground dark:text-white">Core Identity</CardTitle>
                    <CardDescription>How the AI understands your business at a high level.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-foreground dark:text-white font-semibold">Elevator Pitch / Description</Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., We are a B2B SaaS platform that helps..."
                      className="min-h-[120px] resize-none bg-background/50 border-border focus:neon-border transition-all text-base text-foreground dark:text-white"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground font-medium">Be concise. The AI uses this as the foundational context for all advice.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Market & Strategy */}
              <Card glass className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-warning/10 text-warning rounded-lg">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground dark:text-white">Market Positioning</CardTitle>
                    <CardDescription>Define who you serve and why you win.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="target" className="text-foreground dark:text-white font-semibold flex items-center gap-2">Target Market</Label>
                    <Textarea
                      id="target"
                      placeholder="e.g., Mid-market e-commerce brands in North America..."
                      className="min-h-[100px] resize-none bg-background/50 border-border focus:neon-border transition-all text-foreground dark:text-white"
                      value={formData.target || ''}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="edge" className="text-foreground dark:text-white font-semibold flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" /> Competitive Edge
                    </Label>
                    <Textarea
                      id="edge"
                      placeholder="e.g., Proprietary AI algorithm, exclusive partnerships, 10x faster implementation..."
                      className="min-h-[100px] resize-none bg-background/50 border-border focus:neon-border transition-all text-foreground dark:text-white"
                      value={formData.competitiveEdge || ''}
                      onChange={(e) => setFormData({ ...formData, competitiveEdge: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Financials & Metrics */}
              <Card glass className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground dark:text-white">Financial Health</CardTitle>
                    <CardDescription>Helps the AI suggest properly scaled strategies.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="funding" className="text-foreground dark:text-white font-semibold">Total Funding Raised</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-muted-foreground sm:text-sm">$</span>
                        </div>
                        <Input
                          id="funding"
                          type="number"
                          className="pl-7 bg-background/50 border-border focus:neon-border transition-all text-foreground dark:text-white"
                          value={formData.fundingRaised || ''}
                          onChange={(e) => setFormData({ ...formData, fundingRaised: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="runway" className="text-foreground dark:text-white font-semibold flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Estimated Runway
                      </Label>
                      <div className="relative">
                        <Input
                          id="runway"
                          type="number"
                          className="pr-16 bg-background/50 border-border focus:neon-border transition-all text-foreground dark:text-white"
                          value={formData.runway || ''}
                          onChange={(e) => setFormData({ ...formData, runway: parseInt(e.target.value, 10) || 0 })}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-muted-foreground sm:text-sm">months</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sticky Bottom Action Bar for Mobile */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border shadow-lg z-10 flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={cn(
                    "w-full transition-all duration-300 font-medium shadow-glow-primary",
                    saveSuccess ? "bg-success text-success-foreground hover:bg-success/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
                  {saving ? 'Saving...' : saveSuccess ? 'Saved Successfully' : 'Save Changes'}
                </Button>
              </div>

            </div>
          )}
        </div>
      </main>
    </>
  );
}
