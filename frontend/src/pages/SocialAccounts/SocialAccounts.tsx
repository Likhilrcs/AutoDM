import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, PostItem } from '@/services/socialApi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SimulateCommentModal } from '@/components/SimulateCommentModal';
import { toast } from 'sonner';
import {
  Instagram,
  CheckCircle2,
  AlertTriangle,
  Unlink,
  RefreshCw,
  Plus,
  Sparkles,
  Video,
  Layers,
  MessageCircle,
} from 'lucide-react';

export const SocialAccounts: React.FC = () => {
  const queryClient = useQueryClient();
  const [disconnectTargetId, setDisconnectTargetId] = useState<string | null>(null);
  const [simulatorPostId, setSimulatorPostId] = useState<string | null>(null);

  const { data: accounts, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => socialApi.listAccounts(),
  });

  const connectedAccount = accounts && accounts.length > 0 ? accounts[0] : null;

  const { data: posts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['account-posts', connectedAccount?.id],
    queryFn: () => (connectedAccount ? socialApi.getPosts(connectedAccount.id) : Promise.resolve([])),
    enabled: !!connectedAccount?.id,
  });

  const connectMutation = useMutation({
    mutationFn: (platform: string) => socialApi.connect(platform),
    onSuccess: (data) => {
      if (data.mock) {
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['account-posts'] });
        toast.success('Mock Instagram account connected successfully!');
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to connect social account.');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => socialApi.syncAccount(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-posts'] });
      toast.success(res.message || 'Account media and tokens re-synced.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to sync account.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => socialApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-posts'] });
      toast.success('Social account disconnected and its automations paused.');
      setDisconnectTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to disconnect account.');
    },
  });

  return (
    <div className="max-w-5xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Social Accounts</h2>
          <p className="text-xs text-slate-500 mt-1">
            Connect your Instagram Creator or Business account to enable comment-to-DM state machines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => connectMutation.mutate('mock')}
            loading={connectMutation.isPending}
            icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
          >
            Demo Connect (@mybusiness)
          </Button>
          <Button
            onClick={() => connectMutation.mutate('instagram')}
            loading={connectMutation.isPending}
            icon={<Instagram className="w-4 h-4" />}
          >
            Connect with Meta
          </Button>
        </div>
      </div>

      {/* Mock Mode Notice Banner (PRD §31) */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Mock Social Adapter Active
            </h4>
            <Badge variant="mock">Mock Mode</Badge>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            AutoDM is operating in development mock mode. Connecting accounts creates a simulated Instagram Creator profile with sample Reels, bypassing Meta App Review and Facebook Business Verification.
          </p>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Instagram Profiles</CardTitle>
            <CardDescription>Accounts authorized to process post comments into direct messages.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-rose-600">{(error as any)?.message || 'Failed to load accounts.'}</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <EmptyState
              icon={<Instagram className="w-6 h-6" />}
              title="No social accounts connected"
              description="Connect your Instagram Creator or Business account to begin automating comments."
              actionText="Connect Demo Account"
              actionIcon={<Instagram className="w-4 h-4" />}
              onAction={() => connectMutation.mutate('mock')}
            />
          ) : (
            <div className="space-y-6">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-card space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
                        <Instagram className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-slate-900">
                            @{acc.username || 'maya.creates'}
                          </span>
                          <Badge variant={acc.status === 'connected' ? 'active' : 'paused'}>
                            {acc.status}
                          </Badge>
                          <Badge variant="mock">Mock Profile</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Type: <strong className="text-slate-700">{acc.account_type || 'MEDIA_CREATOR'}</strong> · External ID: <code className="text-slate-600">{acc.external_account_id}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(acc.id)}
                        loading={syncMutation.isPending}
                        icon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
                      >
                        Re-Sync
                      </Button>
                      <button
                        onClick={() => setDisconnectTargetId(acc.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Disconnect Account"
                      >
                        <Unlink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Account Permissions Checklist */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Profile & Media Basic</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Manage Comments Webhook</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Manage Direct Messages</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide: Posts Catalog & Active Automations */}
      {connectedAccount && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Instagram Posts & Media Catalog</CardTitle>
              <CardDescription>Select any post to attach an automation or simulate comment reactions.</CardDescription>
            </div>
            <Link to="/automations/new">
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                Create Automation for Post
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {isPostsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
              </div>
            ) : !posts || posts.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No posts synced"
                description="Click 'Re-Sync' above to fetch recent posts from your Instagram account."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.map((post: PostItem) => (
                  <div
                    key={post.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                          {post.media_type === 'REEL' ? (
                            <Video className="w-3 h-3" />
                          ) : (
                            <Layers className="w-3 h-3" />
                          )}
                          {post.media_type}
                        </span>

                        {post.active_automation ? (
                          <Badge variant="active">{post.active_automation}</Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">No trigger active</span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed font-medium">
                        "{post.caption}"
                      </p>

                      <div className="flex items-center gap-3 text-slate-400 text-xs pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count || 42} comments
                        </span>
                        <span>·</span>
                        <span>{post.likes_count || 512} likes</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        icon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                        onClick={() => setSimulatorPostId(post.external_post_id)}
                      >
                        Simulate Comment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!disconnectTargetId}
        onClose={() => setDisconnectTargetId(null)}
        onConfirm={() => {
          if (disconnectTargetId) disconnectMutation.mutate(disconnectTargetId);
        }}
        title="Disconnect Social Account"
        message="Disconnecting this Instagram account will revoke webhook tokens and pause all associated comment automations. Are you sure?"
        confirmText="Disconnect"
        variant="danger"
        loading={disconnectMutation.isPending}
      />

      {/* Comment Simulator Modal */}
      <SimulateCommentModal
        isOpen={!!simulatorPostId}
        onClose={() => setSimulatorPostId(null)}
        defaultPostId={simulatorPostId || undefined}
      />
    </div>
  );
};
