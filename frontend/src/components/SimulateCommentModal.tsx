import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi, SimulateCommentResponse } from '@/services/socialApi';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface SimulateCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPostId?: string;
}

export const SimulateCommentModal: React.FC<SimulateCommentModalProps> = ({
  isOpen,
  onClose,
  defaultPostId,
}) => {
  const queryClient = useQueryClient();
  const [commenter, setCommenter] = useState('creator.fan');
  const [commentText, setCommentText] = useState('send me the link please!');
  const [result, setResult] = useState<SimulateCommentResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      socialApi.simulateComment({
        external_post_id: defaultPostId,
        commenter_username: commenter,
        comment_text: commentText,
      }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Simulation failed.');
    },
  });

  const handleQuickKeyword = (kw: string) => {
    setCommentText(kw);
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Simulate Instagram Comment"
      description="Test your comment-to-DM automation live without waiting for a real Instagram comment."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Quick Test Buttons */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Quick Test Prompts
          </label>
          <div className="flex flex-wrap gap-2">
            {['NOTION', 'GUIDE', 'link please', 'Hey! Send [fail] to test error', 'Repeat comment test'].map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleQuickKeyword(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-medium text-slate-700 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              )
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Commenter Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">@</span>
              <input
                type="text"
                value={commenter}
                onChange={(e) => setCommenter(e.target.value)}
                placeholder="creator.fan"
                className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Comment Text
            </label>
            <textarea
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. Drop the NOTION link please!"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Whole-word Unicode NFKC matching will compare this text against your active triggers.
            </p>
          </div>
        </div>

        {/* Simulation Output Area */}
        {result && (
          <div
            className={`p-4 rounded-xl border ${
              result.success
                ? 'bg-emerald-50/60 border-emerald-200'
                : result.status === 'duplicate'
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            } space-y-3 transition-all`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : result.status === 'duplicate' ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Engine Status: {result.status}
                </span>
              </div>
              {result.matched_keyword && (
                <Badge variant="active">Trigger: #{result.matched_keyword}</Badge>
              )}
            </div>

            <p className="text-xs text-slate-700">{result.message}</p>

            {result.reply_text && (
              <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Outbound Direct Message (Delivered to @{commenter})
                </span>
                <p className="text-xs text-slate-800 whitespace-pre-wrap font-sans">
                  {result.reply_text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            icon={<Send className="w-4 h-4" />}
          >
            Run Simulation
          </Button>
        </div>
      </div>
    </Modal>
  );
};
