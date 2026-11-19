'use client';

import { useState, Suspense } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { microgrammaBold } from '@/lib/fonts';
import { useAuth } from '@/hooks/useAuth';

const WAYPOINTS = [
  { label: 'Dispatch', desc: 'Spatial Routing' },
  { label: 'Crew & Fleet', desc: 'Driver & RSA' },
  { label: 'Settlements', desc: 'Ledgers' },
];

function ObCrewLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithCredentials } = useAuth();

  const isSessionExpired = searchParams.get('session_expired') === 'true';
  const nextTarget = searchParams.get('next') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      await loginWithCredentials(email.trim(), password);
      router.push(nextTarget);
    } catch (err: any) {
      setErrorMsg(err.message || "That email and password don't match. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Mobile-only brand text (icon hidden) */}
      <div className="lg:hidden mb-8 flex flex-col items-center">
        <h1
          className={`${microgrammaBold.className} text-xl font-bold`}
          style={{ color: '#074139' }}
        >
          OBCREW
        </h1>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      <h2 className={`${microgrammaBold.className} text-[1.375rem] font-semibold text-gray-800`}>
        Sign in
      </h2>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        Enter your credentials to access the admin panel.
      </p>

      {isSessionExpired && (
        <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2.5">
          <p className="text-xs">
            Your session has expired. Please sign in again to continue.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-gray-900 mb-1.5 block">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="shiva@obrive.com"
            autoFocus
            autoComplete="email"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/15"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-gray-900 block">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••••••••••"
              autoComplete="current-password"
              required
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-colors focus:border-[#074139] focus:ring-2 focus:ring-[#074139]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            <p className="text-xs text-red-600">{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password}
          className={`${microgrammaBold.className} w-full py-2.5 rounded-lg text-sm text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity`}
          style={{ backgroundColor: '#074139' }}
        >
          {isLoading ? (
            'Signing in…'
          ) : (
            <>
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      <p className="text-[0.6875rem] text-gray-300 text-center mt-10">
        OBPARK Admin · Restricted access
      </p>
    </div>
  );
}

export default function ObCrewLoginPage() {
  return (
    <div className="min-h-screen flex bg-white font-sans">
      <style>{`
        /* Calm, subtle radar rotation & gentle breathing pulses */
        @keyframes subtle-radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes gentle-ring-expand {
          0% { transform: scale(0.45); opacity: 0.4; }
          60% { opacity: 0.18; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes calm-blip-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 0.55; }
        }
        @keyframes subtle-fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .calm-radar-arm {
          transform-origin: 200px 240px;
          animation: subtle-radar-sweep 14s linear infinite;
        }
        .calm-ring-1 {
          transform-origin: 200px 240px;
          animation: gentle-ring-expand 7s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        .calm-ring-2 {
          transform-origin: 200px 240px;
          animation: gentle-ring-expand 7s cubic-bezier(0.25, 1, 0.5, 1) infinite 3.5s;
        }
        .calm-driver-blip {
          transform-origin: 140px 170px;
          animation: calm-blip-breathe 4.5s ease-in-out infinite;
        }
        .calm-mechanic-blip {
          transform-origin: 255px 285px;
          animation: calm-blip-breathe 4.5s ease-in-out infinite 2.25s;
        }
        .calm-waypoint {
          animation: subtle-fade-in 0.8s ease-out backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .calm-radar-arm, .calm-ring-1, .calm-ring-2, .calm-driver-blip, .calm-mechanic-blip, .calm-waypoint {
            animation: none !important;
          }
        }
      `}</style>

      {/* Left — Brand panel matching obpark-admin background (#95D0CC) */}
      <div
        className="hidden lg:flex lg:w-[46%] relative flex-col justify-between overflow-hidden px-12 py-10"
        style={{ background: '#95D0CC' }}
      >
        {/* Brand Header: Logo icon hidden, OBCREW logo text kept */}
        <div>
          <h1 className={`${microgrammaBold.className} text-2xl font-bold text-[#05302a] tracking-wide`}>
            OBCREW
          </h1>
          <p className="text-xs text-[#05302a]/70 mt-1 tracking-wide">
            Admin Panel
          </p>
        </div>

        {/* Center: Subtle, Calm Radar & Telemetry SVG */}
        <div className="relative flex-1 my-8">
          <svg
            viewBox="0 0 400 480"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="calmSweep" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#05302a" stopOpacity="0.18" />
                <stop offset="60%" stopColor="#05302a" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#05302a" stopOpacity="0" />
              </linearGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Concentric radar rings in calm #05302a tones */}
            <circle cx="200" cy="240" r="170" stroke="#05302a" strokeOpacity="0.14" strokeWidth="1.2" fill="none" />
            <circle cx="200" cy="240" r="120" stroke="#05302a" strokeOpacity="0.18" strokeWidth="1.2" fill="none" />
            <circle cx="200" cy="240" r="70" stroke="#05302a" strokeOpacity="0.22" strokeWidth="1.2" fill="none" />

            {/* Subtle crosshair grid lines */}
            <line x1="30" y1="240" x2="370" y2="240" stroke="#05302a" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 6" />
            <line x1="200" y1="70" x2="200" y2="410" stroke="#05302a" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 6" />

            {/* Gentle, calm expanding rings */}
            <circle cx="200" cy="240" r="120" stroke="#05302a" strokeWidth="1.2" fill="none" className="calm-ring-1" />
            <circle cx="200" cy="240" r="120" stroke="#05302a" strokeWidth="1.2" fill="none" className="calm-ring-2" />

            {/* Slow, peaceful radar sweep sector */}
            <path
              d="M 200 240 L 360 200 A 170 170 0 0 0 200 70 Z"
              fill="url(#calmSweep)"
              className="calm-radar-arm"
            />

            {/* Central hub point */}
            <circle cx="200" cy="240" r="4.5" fill="#05302a" />
            <circle cx="200" cy="240" r="9" stroke="#05302a" strokeOpacity="0.3" fill="none" />

            {/* Calm Driver Spot (Soft breathing dot, non-blinking) */}
            <g className="calm-driver-blip">
              <circle cx="140" cy="170" r="4" fill="#05302a" filter="url(#softGlow)" />
              <circle cx="140" cy="170" r="8" stroke="#05302a" strokeOpacity="0.25" fill="none" />
            </g>

            {/* Calm Mechanic Spot (Soft breathing dot, non-blinking) */}
            <g className="calm-mechanic-blip">
              <circle cx="255" cy="285" r="4" fill="#05302a" filter="url(#softGlow)" />
              <circle cx="255" cy="285" r="8" stroke="#05302a" strokeOpacity="0.25" fill="none" />
            </g>
          </svg>

          {/* Waypoint labels matching obpark-admin perspective */}
          <div className="relative h-full flex flex-col justify-between py-6 pl-[60%]">
            {WAYPOINTS.map((w, i) => (
              <div
                key={w.label}
                className="calm-waypoint flex items-center gap-2"
                style={{ animationDelay: `${0.15 + i * 0.15}s` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#05302a]" />
                <span className={`${microgrammaBold.className} text-[0.8125rem] text-[#05302a] tracking-wide`}>
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Left Text — Exactly as requested */}
        <div className="space-y-3">
          <p className="text-sm text-[#05302a]/80 leading-relaxed max-w-xs">
            Crew and User Management.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#05302a]/70">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05302a] opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#05302a]" />
            </span>
          </div>
        </div>
      </div>

      {/* Right — Clean, Simple Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense fallback={<div className="w-full max-w-sm text-center text-sm text-gray-400">Loading…</div>}>
          <ObCrewLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
