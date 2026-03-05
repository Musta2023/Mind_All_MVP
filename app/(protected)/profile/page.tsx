'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenant: {
    name: string;
  };
}

export default function UserProfilePage() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await ApiClient.get('/users/profile');
      setProfile(data);
      setFormData({
        name: data.name || '',
        email: data.email || ''
      });
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
      setError('Failed to load user profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await ApiClient.patch('/users/profile', formData);
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      updateUser(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save user profile:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = profile?.name !== formData.name || profile?.email !== formData.email;

  return (
    <>
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto max-w-2xl space-y-8 p-6 md:p-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-xl font-medium tracking-tight text-foreground dark:text-white">
                {profile?.name ? `${profile.name}'s Profile` : 'Strategic Profile'}
              </h1>
              <p className="text-muted-foreground mt-1">Manage your personal account details and identity.</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <Card glass className="border-border shadow-sm">
                <CardHeader><Skeleton className="h-6 w-48 mb-2 bg-muted/50" /><Skeleton className="h-4 w-64 bg-muted/50" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
                  <Skeleton className="h-10 w-full rounded-lg bg-muted/50" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              
              <Card glass className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground dark:text-white">Personal Information</CardTitle>
                    <CardDescription>Update your name and account email.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground dark:text-white">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      className="bg-background/50 border-border focus:neon-border"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground dark:text-white">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="bg-background/50 border-border focus:neon-border"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </CardContent>
                <div className="bg-muted/30 border-t border-border px-6 py-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={cn(
                      "transition-all duration-300 min-w-[120px] font-medium shadow-glow-primary",
                      saveSuccess ? "bg-success text-success-foreground hover:bg-success/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Saved</>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </Card>

              <Card glass className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground dark:text-white">Account Details</CardTitle>
                    <CardDescription>Metadata related to your account.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Company</span>
                    </div>
                    <span className="text-sm font-medium text-foreground dark:text-white">{profile?.tenant.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Role</span>
                    </div>
                    <Badge variant="outline" className="capitalize border-primary/20 text-primary bg-primary/5">{profile?.role}</Badge>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      </main>
    </>
  );
}
