'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClient } from '@/lib/api-client';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    target: '',
    competitiveEdge: '',
    fundingRaised: '',
    runway: '12',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await ApiClient.post('/startup/profile', {
        ...formData,
        fundingRaised: parseFloat(formData.fundingRaised || '0'),
        runway: parseInt(formData.runway || '12', 10),
        currentMetrics: { revenue: 0, mrr: 0, users: 0 },
        team: [],
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Tell us more about your startup</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does your startup do?"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="text-base sm:text-sm min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Market</Label>
              <Textarea
                id="target"
                placeholder="Who are your target customers?"
                value={formData.target}
                onChange={(e) =>
                  setFormData({ ...formData, target: e.target.value })
                }
                className="text-base sm:text-sm min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitiveEdge">Competitive Edge</Label>
              <Textarea
                id="competitiveEdge"
                placeholder="What makes you different?"
                value={formData.competitiveEdge}
                onChange={(e) =>
                  setFormData({ ...formData, competitiveEdge: e.target.value })
                }
                className="text-base sm:text-sm min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fundingRaised">Funding Raised ($)</Label>
                <Input
                  id="fundingRaised"
                  type="number"
                  placeholder="0"
                  className="text-base sm:text-sm h-11"
                  value={formData.fundingRaised}
                  onChange={(e) =>
                    setFormData({ ...formData, fundingRaised: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="runway">Runway (months)</Label>
                <Input
                  id="runway"
                  type="number"
                  placeholder="12"
                  className="text-base sm:text-sm h-11"
                  value={formData.runway}
                  onChange={(e) =>
                    setFormData({ ...formData, runway: e.target.value })
                  }
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Completing...' : 'Complete Onboarding'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
