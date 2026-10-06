import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, UpdateSettingsRequest } from '@/services/settingsApi';
import { userApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import {
  User,
  Shield,
  KeyRound,
  Save,
  LogOut,
  Lock,
  Trash2,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'safety' | 'security'>('profile');

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [cooldownHours, setCooldownHours] = useState(24);
  const [dailyDmLimit, setDailyDmLimit] = useState(250);
  const [fallbackToStatic, setFallbackToStatic] = useState(true);

  // Security password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getSettings();
      setName(res.profile.name || user?.user_metadata?.name || 'Creator');
      setBio(res.profile.bio || 'Instagram Creator · Automating engagement & lead conversion');
      setTimezone(res.profile.timezone || 'UTC');
      setCooldownHours(res.safety.cooldown_hours || 24);
      setDailyDmLimit(res.safety.daily_dm_limit || 250);
      setFallbackToStatic(res.ai.fallback_to_static ?? true);
      return res;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateSettingsRequest) => settingsApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update settings.');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: async () => {
      toast.success('Your account and all associated data have been permanently deleted.');
      setIsConfirmDeleteOpen(false);
      await signOut();
      window.location.href = '/signup';
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete account.');
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      bio,
      timezone,
      cooldown_hours: cooldownHours,
      daily_dm_limit: dailyDmLimit,
      fallback_to_static: fallbackToStatic,
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile & Account', icon: User },
    { id: 'safety', name: 'AutoDM & Anti-Spam', icon: Shield },
    { id: 'security', name: 'Security & Account', icon: KeyRound },
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage your creator profile, AutoDM rate limits, anti-spam rules, and account security.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile & Workspace */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Creator Profile</CardTitle>
              <CardDescription>Your public creator details and display information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold text-xl flex items-center justify-center border-2 border-indigo-200">
                  {name.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{name || 'Creator'}</h4>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Active Account
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Creator Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Tab 2: AutoDM & Anti-Spam Rules */}
      {activeTab === 'safety' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AutoDM Delivery & Anti-Spam Rules</CardTitle>
              <CardDescription>Protect your Instagram account reputation and control message dispatch velocity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Duplicate Cooldown Window
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={cooldownHours}
                      onChange={(e) => setCooldownHours(parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-semibold">Hours</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prevents spamming followers by ignoring repeated comments from the same user within this window.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Daily DM Dispatch Quota
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={dailyDmLimit}
                      onChange={(e) => setDailyDmLimit(parseInt(e.target.value) || 250)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500 font-semibold">DMs/day</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Daily maximum outbound messages to protect account health and stay within Instagram limits.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Fallback Message Protection</h5>
                    <p className="text-[11px] text-slate-500">
                      If personalized AI messaging is unavailable, automatically deliver your configured static reply and link.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={fallbackToStatic}
                    onChange={(e) => setFallbackToStatic(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Smart Whole-Word Trigger Protection Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    AutoDM matches full trigger keywords accurately (e.g., keyword <code>"link"</code> will trigger on <em>"send me the link"</em>, but will not falsely trigger on <em>"blink"</em> or <em>"linkedin"</em>).
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="w-4 h-4" />}>
                Save AutoDM Rules
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Tab 3: Security & Account */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" loading={isChangingPassword} icon={<Lock className="w-4 h-4" />}>
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Session & Sign Out */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Session &amp; Logout</CardTitle>
              <CardDescription>Sign out of your active AutoDM creator session.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Sign Out of AutoDM</h5>
                  <p className="text-[11px] text-slate-500">
                    Safely log out of your creator account on this device.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => signOut()} icon={<LogOut className="w-3.5 h-3.5" />}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone: Delete Account */}
          <Card className="border-rose-200 bg-rose-50/20">
            <CardHeader>
              <CardTitle className="text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and remove all personal data, automations, triggers, and message history from the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-white">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Permanently Delete Account</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This action will wipe all your automations, active triggers, messages, connected Instagram accounts, and logs from the database. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for Delete Account */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => deleteAccountMutation.mutate()}
        title="Permanently Delete Account?"
        message="Are you sure you want to delete your account? All your automations, active triggers, messages, connected Instagram accounts, and activity logs will be permanently deleted from the database. This action cannot be undone."
        confirmText="Yes, Delete My Account"
        cancelText="Cancel"
        variant="danger"
        loading={deleteAccountMutation.isPending}
      />
    </div>
  );
};
