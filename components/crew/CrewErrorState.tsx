'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CrewApiError } from '@/lib/crew-api';

interface CrewErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  notFoundText?: string;
  showBackToList?: boolean;
  variant?: 'block' | 'inline';
}

export function CrewErrorState({
  error,
  onRetry,
  notFoundText,
  showBackToList = false,
  variant = 'block',
}: CrewErrorStateProps) {
  const pathname = usePathname();
  const status = error instanceof CrewApiError ? error.status : -1;
  const fallback = error instanceof Error ? error.message : 'Something went wrong.';

  let message = fallback;
  let action: React.ReactNode = null;

  if (status === 401) {
    message = 'Your session has expired. Please sign in again.';
    action = (
      <Link
        href={`/login?expired=1&next=${encodeURIComponent(pathname || '/admin/crew')}`}
        className={
          variant === 'inline'
            ? 'font-semibold underline hover:text-red-800'
            : 'px-3 py-1.5 rounded-lg bg-[#074139] text-white text-xs font-semibold hover:opacity-90'
        }
      >
        Sign in again
      </Link>
    );
  } else if (status === 403) {
    message = "You don't have access to crew verification.";
  } else if (status === 404) {
    message = notFoundText || fallback;
    if (showBackToList) {
      action = (
        <Link
          href="/admin/crew"
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to crew list
        </Link>
      );
    }
  } else if (onRetry && variant === 'block') {
    action = (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Try again
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <p className="text-xs text-red-600">
        {message}
        {action && <> {action}</>}
      </p>
    );
  }

  return (
    <div className="p-10 flex flex-col items-center gap-3 text-center">
      <p className="text-xs text-red-600">{message}</p>
      {action}
    </div>
  );
}