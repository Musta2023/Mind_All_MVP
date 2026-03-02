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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {profile?.name ? `${profile.name}'s Profile` : 'Strategic Profile'}
              </h1>
              <p className="text-slate-500 mt-1">Manage your personal account details and identity.</p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader><Skeleton className="h-6 w-48 mb-2" /><Skeleton className="h-4 w-64" /></CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              
              <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Update your name and account email.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </CardContent>
                <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className={cn(
                      "transition-all duration-300 min-w-[120px]",
                      saveSuccess ? "bg-violet-600 hover:bg-violet-700" : "bg-violet-600 hover:bg-violet-700"
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

              <Card className="shadow-sm border-slate-200/60 overflow-hidden">
                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Account Details</CardTitle>
                    <CardDescription>Metadata related to your account.</CardDescription>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">Company</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{profile?.tenant.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">Role</span>
                    </div>
                    <Badge variant="outline" className="capitalize">{profile?.role}</Badge>
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
