import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAutomation, useDeleteAutomation, useToggleStatus } from '@/hooks/useAutomations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const AutomationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: automation, isLoading, isError, error } = useAutomation(id);
  const toggleMutation = useToggleStatus();
  const deleteMutation = useDeleteAutomation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !automation) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Automation Not Found</h3>
        <p className="text-xs text-slate-500">{(error as any)?.message || 'This automation does not exist or was deleted.'}</p>
        <Link to="/automations">
          <Button variant="outline" size="sm">
            Back to Automations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/automations"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors border border-slate-200/80 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{automation.name}</h2>
              <Badge variant={automation.status as any}>{automation.status}</Badge>
            </div>
            {automation.post_url && (
              <a
                href={automation.post_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 mt-0.5"
              >
                <span>Instagram Post: {automation.external_post_id}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toggleMutation.mutate({ id: automation.id, currentStatus: automation.status })
            }
            loading={toggleMutation.isPending}
            icon={automation.status === 'active' ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
          >
            {automation.status === 'active' ? 'Pause' : 'Activate'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="text-rose-600 hover:bg-rose-50 border-rose-200"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Executions</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{automation.stats?.executions || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Successful DMs</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{automation.stats?.success || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs font-semibold text-rose-500 uppercase">Failed / Filtered</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{automation.stats?.failed || 0}</p>
        </Card>
      </div>

      {/* Config Details */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration & Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Trigger Keyword</span>
              <p className="mt-1 font-mono font-semibold text-slate-900 bg-slate-100 inline-block px-2.5 py-1 rounded-md">
                {automation.trigger?.keyword}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Matching Mode</span>
              <p className="mt-1 font-medium text-slate-800 capitalize">
                {automation.trigger?.match_mode} ({automation.trigger?.case_sensitive ? 'Case-sensitive' : 'Case-insensitive'})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Reply Mode</span>
              <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                {automation.reply_mode === 'ai' ? (
                  <Badge variant="ai">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    AI Mode
                  </Badge>
                ) : (
                  <Badge variant="static">Static Template</Badge>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase">Destination Link</span>
              <p className="mt-1 font-mono text-xs text-indigo-600 truncate">
                {automation.link_url || 'None configured'}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Direct Message Body</span>
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-xs whitespace-pre-wrap leading-relaxed">
              {automation.dm_message}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Timeline (PRD §28.4) */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Workflow Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 relative">
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Comment Received</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-6"></div>
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Trigger Matched</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-6"></div>
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Execution Created</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-6"></div>
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>DM Sent</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-2 -mt-6"></div>
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>Success</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(automation.id);
          navigate('/automations');
        }}
        title="Delete Automation"
        message="Are you sure you want to permanently delete this automation?"
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
