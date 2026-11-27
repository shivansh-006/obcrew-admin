'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { isCrewLocationUpdate, useSpatialTelemetryStore } from '@/store/useSpatialTelemetryStore';
import { getSurveillanceNamespaceUrl } from '@/services/spatial-telemetry.service';

export function useAdminSurveillance() {
  const token = useAuthStore((state) => state.token);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const socketRef = useRef<Socket | null>(null);
  const setStatus = useSpatialTelemetryStore((state) => state.setConnectionStatus);
  const upsert = useSpatialTelemetryStore((state) => state.upsertCrewLocation);
  const clear = useSpatialTelemetryStore((state) => state.clearCrewLocations);

  useEffect(() => {
    if (!authenticated || !token || token === 'mock-dev-admin-token') {
      setStatus(token === 'mock-dev-admin-token' ? 'error' : 'disconnected');
      clear();
      return;
    }
    let joined = false;
    setStatus('connecting');
    const socket = io(getSurveillanceNamespaceUrl(), { auth: { token }, autoConnect: false, reconnection: true });
    socketRef.current = socket;
    const onLocation = (payload: unknown) => { if (isCrewLocationUpdate(payload)) upsert(payload); };
    const onConnect = () => {
      setStatus('connecting');
      socket.emit('join:admin-surveillance', {}, (ack: { status?: string } | undefined) => {
        if (socket.connected && ack?.status === 'subscribed') { joined = true; setStatus('connected'); }
        else { joined = false; setStatus('error'); }
      });
    };
    const onDisconnect = () => { joined = false; setStatus('reconnecting'); };
    const onConnectError = (error: Error) => {
      joined = false;
      setStatus(/unauthorized|forbidden|token|auth/i.test(error.message) ? 'error' : 'reconnecting');
    };
    socket.on('crew:location:update', onLocation);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.connect();
    return () => {
      socket.off('crew:location:update', onLocation);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
      socketRef.current = null;
      if (joined) setStatus('disconnected');
    };
  }, [authenticated, token, setStatus, upsert, clear]);
}
