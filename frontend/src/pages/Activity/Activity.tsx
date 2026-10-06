import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  executionsApi,
  ExecutionItem,
  ExecutionStats,
  IncomingEventItem,
  ExecutionDetail,
} from '@/services/executionsApi';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimulateCommentModal } from '@/components/SimulateCommentModal';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  Eye,
  Zap,
  Terminal,
  Instagram,
  RefreshCw,
  ChevronRight,
  PlayCircle,
  MessageSquare,
} from 'lucide-react';
import { clsx } from 'clsx';

export const Activity: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'executions' | 'events'>('executions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // 1. Fetch Stats from DB
  const { data: stats, isLoading: statsLoading } = useQuery<ExecutionStats>({
    queryKey: ['execution-stats'],
    queryFn: () => executionsApi.getStats(),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 2. Fetch Executions from DB
  const {
    data: executions,
    isLoading: executionsLoading,
    isFetching: executionsFetching,
    refetch: refetchExecutions,
  } = useQuery<ExecutionItem[]>({
    queryKey: ['executions', statusFilter],
    queryFn: () => executionsApi.list(statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 3. Fetch Raw Incoming Events from DB
  const {
    data: incomingEvents,
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    refetch: refetchEvents,
  } = useQuery<IncomingEventItem[]>({
    queryKey: ['incoming-events'],
    queryFn: () => executionsApi.listEvents(),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 4. Fetch Execution Detail & Step Trace when inspected
  const {
    data: detail,
    isLoading: detailLoading,
    refetch: refetchDetail,
  } = useQuery<ExecutionDetail>({
    queryKey: ['execution-detail', selectedExecutionId],
    queryFn: () => executionsApi.getDetail(selectedExecutionId!),
    enabled: !!selectedExecutionId,
  });

  // 5. Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (id: string) => executionsApi.retry(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Execution queued for retry.');
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      queryClient.invalidateQueries({ queryKey: ['execution-stats'] });
      if (selectedExecutionId) {
        refetchDetail();
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to retry execution.');
    },
  });

  const handleManualRefresh = () => {
    refetchExecutions();
    refetchEvents();
    queryClient.invalidateQueries({ queryKey: ['execution-stats'] });
    toast.success('Activity and logs refreshed.');
  };

  // Filter executions by search query
  const filteredExecutions = (executions || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.automation_name.toLowerCase().includes(q) ||
      item.commenter_username.toLowerCase().includes(q) ||
      item.comment_text.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q)
    );
  });

  // Filter events by search query
  const filteredEvents = (incomingEvents || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.commenter_username.toLowerCase().includes(q) ||
      item.comment_text.toLowerCase().includes(q) ||
      (item.account_username && item.account_username.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="success" className="gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="failed" className="gap-1 font-medium">
            <AlertCircle className="w-3 h-3" /> Failed
          </Badge>
        );
      case 'sending':
      case 'pending':
        return (
          <Badge variant={status as BadgeVariant} className="gap-1 font-medium">
            <Clock className="w-3 h-3 animate-spin" /> {status}
          </Badge>
        );
      case 'skipped':
        return (
          <Badge variant="skipped" className="gap-1 font-medium">
            Skipped
          </Badge>
        );
      default:
        return <Badge variant="draft">{status}</Badge>;
    }
  };

  const getStepBadgeVariant = (stepStatus: string): BadgeVariant => {
    if (stepStatus === 'success') return 'success';
    if (stepStatus === 'failed') return 'failed';
    if (stepStatus === 'skipped') return 'skipped';
    if (stepStatus === 'fallback') return 'fallback';
    if (stepStatus === 'rejected') return 'rejected';
    return 'draft';
  };

  const getNodeFriendlyName = (node: string) => {
    switch (node) {
      case 'ingest_event':
        return '1. Comment Ingested';
      case 'load_candidates':
        return '2. Active Automations Checked';
      case 'match_keyword':
        return '3. Keyword Trigger Matched';
      case 'create_execution':
        return '4. AutoDM Initialized';
      case 'render_static_reply':
        return '5. Reply Message Formatted';
      case 'send_message':
        return '6. Instagram DM Delivered';
      case 'finalize':
        return '7. Execution Complete';
      default:
        return node.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ActivityIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity & Logs</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit log of incoming Instagram comments, trigger evaluation, and AutoDM execution steps.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Polling Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            )}
          >
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              )}
            />
            {autoRefresh ? 'Live (5s)' : 'Paused'}
          </button>

          {/* Manual Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="text-xs gap-1.5"
            disabled={executionsFetching || eventsFetching}
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', (executionsFetching || eventsFetching) && 'animate-spin')} />
            Refresh
          </Button>

          {/* Test Trigger Simulator Button */}
          <Button
            size="sm"
            onClick={() => setIsSimulatorOpen(true)}
            className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Simulate Comment
          </Button>
        </div>
      </div>

      {/* Stats Cards (Connected with Supabase DB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Executions</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : stats?.total_executions ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">automated DMs</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">
              {statsLoading ? '...' : `${stats?.success_rate ?? 100}%`}
            </span>
            <span className="text-xs text-slate-400 font-medium">{stats?.success_count ?? 0} delivered</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed / In Queue</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : stats?.failed_count ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">{stats?.pending_count ?? 0} pending</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Raw Events Captured</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : stats?.total_events ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">incoming comments</span>
          </div>
        </Card>
      </div>

      {/* Main Tabs and Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 border-b md:border-b-0 border-slate-200">
            <button
              onClick={() => setActiveTab('executions')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px',
                activeTab === 'executions'
                  ? 'border-indigo-600 text-indigo-700 bg-white md:bg-transparent rounded-t-lg md:rounded-none shadow-sm md:shadow-none'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              <Zap className="w-4 h-4" />
              Automated Executions
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600">
                {executions?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px',
                activeTab === 'events'
                  ? 'border-indigo-600 text-indigo-700 bg-white md:bg-transparent rounded-t-lg md:rounded-none shadow-sm md:shadow-none'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              <Instagram className="w-4 h-4" />
              Raw Incoming Webhook Events
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600">
                {incomingEvents?.length ?? 0}
              </span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2.5">
            {activeTab === 'executions' && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {['all', 'success', 'failed', 'pending'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={clsx(
                      'px-2.5 py-1 rounded text-xs font-semibold capitalize transition-all',
                      statusFilter === st
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'executions' ? 'Search executions...' : 'Search comments...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Automation Executions */}
        {activeTab === 'executions' && (
          <div>
            {executionsLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Zap className="w-7 h-7" />}
                  title="No executions found"
                  description="When an Instagram user comments with your trigger keyword, the automated execution trace will appear here."
                  actionText="Simulate a Comment"
                  onAction={() => setIsSimulatorOpen(true)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/75">
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead>Automation</TableHead>
                      <TableHead>Commenter</TableHead>
                      <TableHead>Comment Text</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExecutions.map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedExecutionId(item.id)}
                      >
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 text-sm">{item.automation_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {item.id.slice(0, 8)}...</div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-slate-800 text-sm">@{item.commenter_username}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-mono line-clamp-1 max-w-[200px]">
                            {item.comment_text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-600">{item.attempt_count}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : 'Just now'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => retryMutation.mutate(item.id)}
                                disabled={retryMutation.isPending}
                              >
                                <RotateCw className="w-3 h-3" />
                                Retry
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedExecutionId(item.id)}
                            >
                              <Eye className="w-3 h-3" />
                              Inspect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Raw Webhook & Comment Events */}
        {activeTab === 'events' && (
          <div>
            {eventsLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  icon={<Instagram className="w-7 h-7" />}
                  title="No incoming events logged"
                  description="When Meta webhooks deliver comment events from your posts or reels, they will be archived here."
                  actionText="Simulate a Comment"
                  onAction={() => setIsSimulatorOpen(true)}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/75">
                      <TableHead>Event Type</TableHead>
                      <TableHead>Commenter</TableHead>
                      <TableHead>Comment Content</TableHead>
                      <TableHead>Post / Media ID</TableHead>
                      <TableHead>Execution Link</TableHead>
                      <TableHead>Received At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <Badge variant="draft" className="uppercase text-[10px] tracking-wider">
                            {ev.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-800 text-sm">@{ev.commenter_username}</span>
                          {ev.account_username && (
                            <span className="text-[11px] text-slate-400 block">on @{ev.account_username}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-md max-w-sm whitespace-pre-wrap">
                            {ev.comment_text}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500 font-mono">
                            {ev.external_post_id ? ev.external_post_id.slice(0, 14) + '...' : 'Account-wide'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {ev.matched_execution_id ? (
                            <button
                              onClick={() => {
                                setSelectedExecutionId(ev.matched_execution_id!);
                                setActiveTab('executions');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded"
                            >
                              <Zap className="w-3 h-3" />
                              View Execution
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No keyword match / ignored</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {ev.created_at
                              ? new Date(ev.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : 'Recently'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Detail & Node Trace Modal */}
      <Modal
        isOpen={!!selectedExecutionId}
        onClose={() => setSelectedExecutionId(null)}
        title="Execution Step Trace & Audit Log"
        maxWidth="xl"
      >
        {detailLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{detail.automation_name}</h3>
                  {getStatusBadge(detail.status)}
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Execution ID: {detail.id}
                </div>
              </div>

              {detail.status === 'failed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retryMutation.mutate(detail.id)}
                  disabled={retryMutation.isPending}
                  className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Retry Execution
                </Button>
              )}
            </div>

            {/* Comment & Direct Message Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Triggering Comment
                </span>
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-600">
                    Author: <span className="font-bold text-slate-900">@{detail.commenter_username}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-mono text-slate-800">
                    "{detail.comment_text}"
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Automated DM Sent
                </span>
                {detail.messages && detail.messages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Status:{' '}
                        <span
                          className={clsx(
                            'font-bold',
                            detail.messages[0].status === 'sent' ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {detail.messages[0].status.toUpperCase()}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {detail.messages[0].external_message_id?.slice(0, 16)}...
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 font-medium whitespace-pre-wrap">
                      {detail.messages[0].body}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic py-2">
                    No outbound message recorded for this execution.
                  </div>
                )}
              </div>
            </div>

            {/* Node-by-node Automation Step Trace */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  Automation Execution Steps ({detail.steps?.length ?? 0} Steps)
                </h4>
                <span className="text-xs text-slate-400">
                  Total Duration:{' '}
                  {(detail.steps || []).reduce((acc, curr) => acc + (curr.duration_ms || 0), 0)}ms
                </span>
              </div>

              {detail.steps && detail.steps.length > 0 ? (
                <div className="space-y-2">
                  {detail.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {getNodeFriendlyName(step.node)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono">
                            {step.duration_ms !== undefined ? `${step.duration_ms}ms` : '0ms'}
                          </span>
                          <Badge
                            variant={getStepBadgeVariant(step.status)}
                            className="text-[10px] uppercase font-bold py-0.5"
                          >
                            {step.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Step Details if present */}
                      {step.summary && Object.keys(step.summary).length > 0 && (
                        <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-100 text-slate-600 space-y-1">
                          {Object.entries(step.summary).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-800">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.error_code && (
                        <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Error: {step.error_code}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                  No execution steps recorded in database.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Simulator Modal for Instant DB testing */}
      <SimulateCommentModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
