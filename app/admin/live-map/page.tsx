'use client';

import { Radio, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { microgrammaBold } from '@/lib/fonts';

export default function LiveMapPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`${microgrammaBold.className} text-xl font-bold text-slate-900 tracking-wide`}>
            Spatial Telemetry Surveillance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time GPS tracking stream connected to obpark-maps Redis GEO spatial cluster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>WebSocket Stream: Connected (Port 3002)</span>
          </div>

          <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Map View Canvas Container */}
      <div className="relative w-full h-[600px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: 'radial-gradient(#00E5FF 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />

        {/* Tactical UI Overlay */}
        <div className="absolute top-4 left-4 z-10 p-3 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white space-y-1">
          <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest block">Active Telemetry Radius</span>
          <span className={`${microgrammaBold.className} text-base`}>Delhi NCR · 5.0 KM Radius</span>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-300">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#00E5FF]" /> 34 Drivers Online</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> 12 RSA Mechanics</span>
          </div>
        </div>

        <div className="text-center z-10 space-y-3 p-6 max-w-md bg-slate-900/70 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h3 className={`${microgrammaBold.className} text-sm font-bold text-white tracking-wider`}>
              Interactive Map Canvas Ready
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Developers can embed Leaflet.js, Mapbox GL, or Google Maps JavaScript API here and subscribe to:
            </p>
            <code className="mt-2 block px-2.5 py-1.5 rounded bg-black/50 text-[11px] font-mono text-cyan-300 border border-cyan-500/20">
              socket.on('crew:location:update', (loc) =&gt; updateMarker(loc))
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
