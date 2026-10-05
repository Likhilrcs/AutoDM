import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'active'
  | 'paused'
  | 'draft'
  | 'success'
  | 'failed'
  | 'pending'
  | 'sending'
  | 'skipped'
  | 'fallback'
  | 'rejected'
  | 'mock'
  | 'live'
  | 'ai'
  | 'static';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'draft', className, children, ...props }) => {
  const variants: Record<BadgeVariant, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    sending: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    skipped: 'bg-slate-100 text-slate-600 border-slate-200',
    fallback: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    rejected: 'bg-purple-50 text-purple-700 border-purple-200',
    mock: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    live: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    ai: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium',
    static: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
          variants[variant] || variants.draft,
          className
        )
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
};
