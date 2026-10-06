import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Zap,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';

export const Signup: React.FC = () => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const { signUp, verifyOtp, resendOtp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || 'Google sign-in failed. Please verify Supabase Google OAuth provider is enabled.');
        setGoogleLoading(false);
      }
    } catch (err: any) {
      toast.error('Could not connect to Google authentication.');
      setGoogleLoading(false);
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    let timer: any;
    if (step === 'verify' && resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error, needVerification } = await signUp(email.trim(), password, name.trim());
      if (error) {
        toast.error(error.message || 'Failed to create account.');
      } else if (needVerification) {
        toast.success(`Verification code sent to ${email.trim()}! Please check your email.`);
        setStep('verify');
        setResendCooldown(30);
      } else {
        toast.success('Account created! Welcome to AutoDM.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\s/g, '');
    if (!cleanOtp) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    setVerifying(true);
    try {
      const { error } = await verifyOtp(email.trim(), cleanOtp);
      if (error) {
        toast.error(error.message || 'Invalid or expired verification code. Please check and try again.');
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
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      const { error } = await resendOtp(email.trim());
      if (error) {
        toast.error(error.message || 'Failed to resend code. Please try again.');
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

        {step === 'form' ? (
          <>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
              Create your creator account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">
              Verify your email address
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Enter the verification code sent to your email to access your dashboard
            </p>
          </>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/80 sm:px-10">
          {/* STEP 1: SIGNUP FORM */}
          {step === 'form' && (
            <>
              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-6"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">
                    or sign up with email
                  </span>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSignupSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
                  Full Name or Brand
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maya Lin"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maya@creator.com"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password (min. 6 characters)
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending verification code...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
          )}

          {/* STEP 2: VERIFY OTP FORM */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">We sent a 6-digit confirmation code to:</p>
                  <p className="text-sm font-bold text-slate-900">{email}</p>
                </div>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
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
                    placeholder="12345678"
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

              {/* Resend & Back controls */}
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

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Use a different email address
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
