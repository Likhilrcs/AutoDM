import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Zap,
  Loader2,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Mail,
} from 'lucide-react';

export const VerifyOtp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    const cleanOtp = otp.trim().replace(/\s/g, '');
    if (!cleanOtp) {
      toast.error('Please enter the verification code.');
      return;
    }

    setVerifying(true);
    try {
      const { error } = await verifyOtp(email.trim(), cleanOtp);
      if (error) {
        toast.error(error.message || 'Invalid or expired verification code.');
      } else {
        toast.success('Email verified successfully! Welcome to AutoDM 🎉');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim() || resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await resendOtp(email.trim());
      if (error) {
        toast.error(error.message || 'Failed to resend code.');
      } else {
        toast.success(`A fresh verification code was sent to ${email.trim()}`);
        setResendCooldown(30);
        setOtp('');
      }
    } catch (err: any) {
      toast.error('Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            Auto<span className="text-indigo-600">DM</span>
          </span>
        </Link>
        <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
          Verify your email address
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Enter the verification code sent to your email to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/80 sm:px-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            {email ? (
              <div>
                <p className="text-xs text-slate-500">Confirmation code sent to:</p>
                <p className="text-sm font-bold text-slate-900">{email}</p>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            {!emailParam && (
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@creator.com"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="otp" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                Enter Verification Code (OTP)
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="block w-full py-3 px-4 border-2 border-indigo-100 focus:border-indigo-600 rounded-xl text-center text-2xl font-mono tracking-[0.4em] font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Check your spam folder if you don't see it in your inbox
              </p>
            </div>

            <button
              type="submit"
              disabled={verifying || !otp.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying code...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verify &amp; Go to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={resendCooldown > 0 || resending}
              onClick={handleResendCode}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
            </button>

            <Link
              to="/signup"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Back to Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
