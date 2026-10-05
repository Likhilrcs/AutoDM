import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboardApi';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimulateCommentModal } from '@/components/SimulateCommentModal';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Plus,
  PlayCircle,
  ChevronRight,
  Sparkles,
  Instagram,
  ArrowUpRight,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'sent' | 'failed'>('all');

  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary(),
    refetchInterval: 5000, // 5s polling per PRD §14
  });

  const filteredActivity = (summary?.recent_activity || []).filter((item) => {
    if (activityFilter === 'sent') return item.dm_status === 'sent';
    if (activityFilter === 'failed') return item.dm_status === 'failed';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Instagram Account Connection Status Card (User Flow) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Instagram className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Instagram Account
              </span>
              {summary?.connected_account && summary.connected_account.status === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  ❌ Not connected
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              {summary?.connected_account && summary.connected_account.status === 'connected'
                ? `@${summary.connected_account.username || 'mybusiness'}`
                : 'No account linked yet'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Welcome, {user?.user_metadata?.name || 'Creator'} · Live comment-to-DM automation status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={() => setIsSimulatorOpen(true)}
            icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
          >
            Simulate Comment
          </Button>

          {summary?.connected_account && summary.connected_account.status === 'connected' ? (
            <Link to="/automations/new">
              <Button icon={<Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />}>
                Create AutoDM
              </Button>
            </Link>
          ) : (
            <Link to="/social-accounts">
              <Button icon={<Instagram className="w-4 h-4" />}>
                Connect Instagram
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* 6 Stat Overview Cards (PRD §28.1, §28.3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              title="Automations"
              value={summary?.total_automations || 0}
              icon={<Zap className="w-4 h-4" />}
              color="indigo"
            />
            <StatCard
              title="Active Triggers"
              value={summary?.active_automations || 0}
              icon={<PlayCircle className="w-4 h-4" />}
              color="emerald"
            />
            <StatCard
              title="Comments Ingested"
              value={summary?.total_comments || 0}
              icon={<MessageSquare className="w-4 h-4" />}
              color="slate"
            />
            <StatCard
              title="Total DMs"
              value={summary?.total_dms || 0}
              icon={<Send className="w-4 h-4" />}
              color="indigo"
            />
            <StatCard
              title="Success Rate"
              value={`${summary?.success_rate || 100}%`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              color="emerald"
            />
            <StatCard
              title="Failed / Blocked"
              value={summary?.failed_dms || 0}
              icon={<AlertCircle className="w-4 h-4" />}
              color="rose"
            />
          </>
        )}
      </div>

      {/* Slide 1: How AutoDM Works Interactive Guide */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                Workflow Engine
              </span>
              <h3 className="text-lg font-bold text-white">How AutoDM Converts Comments to DMs</h3>
            </div>
            <Link
              to="/automations/new"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Build First Flow</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                1
              </div>
              <h4 className="text-xs font-bold text-white">Post on Instagram</h4>
              <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                Publish a Reel, Carousel or Post asking followers to drop a specific keyword.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                2
              </div>
              <h4 className="text-xs font-bold text-white">Webhook Ingestion</h4>
              <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                Instagram sends comment webhook. AutoDM normalizes Unicode NFKC and strips emojis.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                3
              </div>
              <h4 className="text-xs font-bold text-white">LangGraph Matching</h4>
              <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                Deterministic regex matches keyword, checks 24h dedupe cooldown, and formats reply.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/40 flex items-center justify-center text-xs font-bold text-white">
                4
              </div>
              <h4 className="text-xs font-bold text-white">Instant DM Delivery</h4>
              <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                Direct message delivered to user's inbox with your link and converted into an active lead.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Active Campaigns & Connected Account */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Active Automation Campaigns</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Campaigns currently scanning comment threads.</p>
              </div>
              <Link to="/automations" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                View all ({summary?.total_automations || 0})
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : !summary?.active_campaigns || summary.active_campaigns.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-slate-500">No active campaigns running right now.</p>
                  <Link to="/automations/new">
                    <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                      Create Your First Automation
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.active_campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{camp.name}</span>
                            <Badge variant="active" className="text-[10px]">
                              #{camp.trigger_keyword}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Target: {camp.target_post_id ? `Post (${camp.target_post_id})` : 'All Posts'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {camp.dms_sent} DMs
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connected Instagram Account Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Instagram Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-rose-200/50">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Instagram className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-sm text-slate-900 block truncate">
                    @{summary?.connected_account?.username || 'maya.creates'}
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Token Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">Followers</span>
                  <span className="text-sm font-bold text-slate-800">
                    {(summary?.connected_account?.followers_count || 24500).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-400 block font-medium">Platform</span>
                  <span className="text-sm font-bold text-indigo-600">Instagram</span>
                </div>
              </div>

              <Link to="/social-accounts" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Manage Social Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity Table with Live Filter Tabs */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Recent Comment Activity</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Live comment matches and outbound automated DMs.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter('sent')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activityFilter === 'sent'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Delivered
              </button>
              <button
                onClick={() => setActivityFilter('failed')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activityFilter === 'failed'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Failed
              </button>
            </div>

            <Link
              to="/activity"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group ml-2"
            >
              <span>View Full Log</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-xs text-slate-500">{(error as any)?.message || 'Failed to load activity.'}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredActivity.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<MessageSquare className="w-6 h-6" />}
                title="No comment activity found"
                description="Simulate a comment or connect an Instagram post to watch live automations trigger."
                actionText="Simulate Comment Now"
                actionIcon={<Sparkles className="w-4 h-4" />}
                onAction={() => setIsSimulatorOpen(true)}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commenter</TableHead>
                  <TableHead>Comment Text</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Automation</TableHead>
                  <TableHead>DM Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-semibold text-xs text-slate-900">
                        @{item.commenter_username}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        "{item.comment_text}"
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="active" className="text-[10px]">
                        {item.trigger_keyword}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-xs text-slate-800">
                        {item.automation_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.dm_status === 'sent' ? 'success' : 'failed'}>
                        {item.dm_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Just now'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comment Simulator Modal */}
      <SimulateCommentModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
