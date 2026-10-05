import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/services/socialApi';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Instagram, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Meta authorization was cancelled.');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code was returned by Instagram.');
      return;
    }

    const processOAuth = async () => {
      try {
        const res = await socialApi.handleCallback(code, state || undefined);
        setStatus('success');
        toast.success(`Instagram account @${res.username || 'mybusiness'} successfully connected!`);
        queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

        setTimeout(() => {
          navigate('/dashboard?connected=true');
        }, 1200);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to exchange authorization code with Meta.');
      }
    };

    processOAuth();
  }, [searchParams, navigate, queryClient]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-xl border-slate-200/80">
        <CardContent className="space-y-6 p-0">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Instagram className="w-8 h-8" />
          </div>

          {status === 'loading' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold text-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Instagram...</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Exchanging authorization tokens and retrieving your Instagram profile and posts.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                <CheckCircle2 className="w-5 h-5" />
                <span>Connected Successfully!</span>
              </div>
              <p className="text-xs text-slate-500">
                Your Instagram profile is authorized. Redirecting to your dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-lg">
                <AlertCircle className="w-5 h-5" />
                <span>Connection Failed</span>
              </div>
              <p className="text-xs text-slate-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                {errorMessage}
              </p>
              <Button onClick={() => navigate('/social-accounts')} className="w-full">
                Back to Social Accounts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
