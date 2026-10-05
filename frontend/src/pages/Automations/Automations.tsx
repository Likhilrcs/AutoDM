import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutomations, useDeleteAutomation, useToggleStatus } from '@/hooks/useAutomations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Plus,
  Search,
  Zap,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const Automations: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: automations, isLoading, isError, error, refetch } = useAutomations(
    statusFilter || undefined,
    searchQuery || undefined
  );
  const deleteMutation = useDeleteAutomation();
  const toggleMutation = useToggleStatus();
  const navigate = useNavigate();

  const handleDeleteConfirm = async () => {
    if (deleteTargetId) {
      await deleteMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Automations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your comment-to-DM triggers and active response flows.
          </p>
        </div>
        <Link to="/automations/new">
          <Button icon={<Plus className="w-4 h-4" />}>
            Create Automation
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['', 'active', 'paused', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Failed to load automations</h3>
            <p className="text-xs text-slate-500 mt-1">{(error as any)?.message || 'Connection error'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : !automations || automations.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-6 h-6" />}
          title={searchQuery || statusFilter ? 'No matching automations' : 'No automations yet'}
          description={
            searchQuery || statusFilter
              ? 'Try changing your search keywords or clearing filters.'
              : 'Create your first comment trigger to start automatically sending resources and links.'
          }
          actionText={searchQuery || statusFilter ? 'Clear Filters' : 'Create Automation'}
          actionIcon={<Plus className="w-4 h-4" />}
          onAction={() => {
            if (searchQuery || statusFilter) {
              setSearchQuery('');
              setStatusFilter('');
            } else {
              navigate('/automations/new');
            }
          }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Trigger Keyword</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      to={`/automations/${item.id}`}
                      className="font-bold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1.5 group"
                    >
                      <span>{item.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    {item.post_url && (
                      <a
                        href={item.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 mt-0.5"
                      >
                        <span>View Instagram Post</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                      {item.keyword}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.reply_mode === 'ai' ? (
                      <Badge variant="ai" className="gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        AI Mode
                      </Badge>
                    ) : (
                      <Badge variant="static">Static</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status as any}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-xs text-slate-700">
                      {item.executions || 0} DMs
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() =>
                          toggleMutation.mutate({ id: item.id, currentStatus: item.status })
                        }
                        title={item.status === 'active' ? 'Pause Automation' : 'Activate Automation'}
                        disabled={toggleMutation.isPending}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        {item.status === 'active' ? (
                          <Pause className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        title="Delete Automation"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Automation"
        message="Are you sure you want to delete this automation? It will immediately stop responding to comments. This action cannot be undone."
        confirmText="Delete Automation"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
