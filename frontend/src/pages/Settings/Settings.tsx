import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, UpdateSettingsRequest } from '@/services/settingsApi';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import {
  User,
  Cpu,
  Shield,
  Webhook,
  KeyRound,
  Check,
  Copy,
  Sparkles,
  Save,
  CheckCircle2,
  LogOut,
  Lock,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'ai' | 'safety' | 'webhook' | 'security'>('profile');

  // Form states
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [cooldownHours, setCooldownHours] = useState(24);
  const [dailyDmLimit, setDailyDmLimit] = useState(250);
  const [fallbackToStatic, setFallbackToStatic] = useState(true);

  // Playground state
  const [testPrompt, setTestPrompt] = useState('Hey! Can you send me the free Notion template?');
  const [testLink, setTestLink] = useState('https://autodm.dev/demo-guide');
  const [testOutput, setTestOutput] = useState<string | null>(null);

  // Security password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getSettings();
      setName(res.profile.name || user?.user_metadata?.name || 'Maya Demo');
      setBio(res.profile.bio || 'Creator & Educator · Automating IG engagement');
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

  const testLlmMutation = useMutation({
    mutationFn: () => settingsApi.testLlm(testPrompt, testLink),
    onSuccess: (data) => {
      setTestOutput(data.output);
      toast.success(`Generated preview via ${data.provider} in ${data.latency_ms}ms`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'LLM generation failed.');
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tabs = [
    { id: 'profile', name: 'Profile & Workspace', icon: User },
    { id: 'ai', name: 'AI & LLM Engine', icon: Cpu },
    { id: 'safety', name: 'Safety & Guardrails', icon: Shield },
    { id: 'webhook', name: 'Webhooks & Meta API', icon: Webhook },
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
          Manage your creator profile, LangGraph AI configurations, safety guardrails, and Meta webhook credentials.
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
                  {name.charAt(0).toUpperCase() || 'M'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{name || 'Maya Demo'}</h4>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Pro Creator Plan
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

      {/* Tab 2: AI & LLM Engine */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LangGraph & LLM Configuration</CardTitle>
                  <CardDescription>Groq-powered high-speed AI reply generator and intent gates.</CardDescription>
                </div>
                <Badge variant="active">Groq Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Model
                  </span>
                  <span className="text-xs font-bold text-slate-900">llama-3.1-8b-instant</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Latency Benchmark
                  </span>
                  <span className="text-xs font-bold text-emerald-600">~180ms inference</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                    Deterministic Fallback
                  </span>
                  <span className="text-xs font-bold text-indigo-600">Enabled (PRD §23)</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Static Fallback Guardrail</h5>
                    <p className="text-[11px] text-slate-500">
                      If Groq encounters rate-limiting or intent rejection, deliver configured static DM template.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={fallbackToStatic}
                    onChange={(e) => setFallbackToStatic(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Link Preservation Rule</h5>
                    <p className="text-[11px] text-slate-500">
                      Destination links are appended verbatim and guaranteed never to be halluncinated.
                    </p>
                  </div>
                  <Badge variant="success">Enforced</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Reply Playground */}
          <Card>
            <CardHeader>
              <CardTitle>AI Generation Playground</CardTitle>
              <CardDescription>Test the exact prompt format and output before publishing automations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sample Comment</label>
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Link URL</label>
                <input
                  type="url"
                  value={testLink}
                  onChange={(e) => setTestLink(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {testOutput && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider block">
                    LLM Response Preview
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans">{testOutput}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                size="sm"
                onClick={() => testLlmMutation.mutate()}
                loading={testLlmMutation.isPending}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Generate Preview
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Tab 3: Safety & Guardrails */}
      {activeTab === 'safety' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits & Anti-Spam Guardrails</CardTitle>
              <CardDescription>Protect your Instagram account reputation and adhere to Meta limits.</CardDescription>
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
                    Ignores repeated comments from the same follower within this window (PRD §26.1).
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
                    Daily ceiling to keep outbound volumes below Meta Instagram velocity triggers.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Unicode NFKC Whole-Word Matcher Enforced
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Comments are normalized using Unicode NFKC. Emojis and punctuations are collapsed, and triggers match exact whole-words to prevent false positives (e.g., keyword <code>"link"</code> will not trigger on <code>"blink"</code> or <code>"linkedin"</code>).
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" loading={updateMutation.isPending} icon={<Save className="w-4 h-4" />}>
                Save Safety Rules
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Tab 4: Webhooks & Meta API */}
      {activeTab === 'webhook' && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook & Developer Credentials</CardTitle>
            <CardDescription>Use these credentials to register the Instagram Webhook in Meta for Developers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Webhook Callback URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings?.webhook?.endpoint_url || 'http://localhost:8000/api/v1/webhooks/instagram'}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      settings?.webhook?.endpoint_url || 'http://localhost:8000/api/v1/webhooks/instagram',
                      'Webhook URL'
                    )
                  }
                  icon={
                    copiedKey === 'Webhook URL' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Verify Token</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={settings?.webhook?.verify_token || 'autodm_meta_verify_secret_token'}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyToClipboard(
                      settings?.webhook?.verify_token || 'autodm_meta_verify_secret_token',
                      'Verify Token'
                    )
                  }
                  icon={
                    copiedKey === 'Verify Token' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>HMAC Signature Verification: Enabled</span>
              </span>
              <span className="font-semibold text-emerald-600">Active</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Security & Danger Zone */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your Supabase authentication password.</CardDescription>
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

          {/* Danger Zone */}
          <Card className="border-rose-200 bg-rose-50/20">
            <CardHeader>
              <CardTitle className="text-rose-600">Danger Zone</CardTitle>
              <CardDescription>Actions that affect your active sessions and local mock data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-white">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Sign Out Everywhere</h5>
                  <p className="text-[11px] text-slate-500">
                    Terminates all active JWT sessions on all connected devices.
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => signOut()} icon={<LogOut className="w-3.5 h-3.5" />}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
