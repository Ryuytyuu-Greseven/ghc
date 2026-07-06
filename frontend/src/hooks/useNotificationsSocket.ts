import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { environment } from '@env/environment';
import type { AppNotification } from '../types';

const BACKEND_URL = environment.mainBackendUrl;

export function useNotificationsSocket(
  onNewNotification: (notification: AppNotification) => void,
) {
  const handlerRef = useRef(onNewNotification);
  handlerRef.current = onNewNotification;

  useEffect(() => {
    const token = localStorage.getItem('ghc_auth_token');
    if (!token) return;

    const socket: Socket = io(`${BACKEND_URL}/notifications`, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('notification:new', (notification: AppNotification) => {
      handlerRef.current(notification);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);
}
