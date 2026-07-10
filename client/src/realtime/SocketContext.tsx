import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken, subscribeToAccessToken } from '../lib/tokenStore';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    function connectWithToken(token: string | null) {
      socketRef.current?.disconnect();
      socketRef.current = null;

      if (!token) {
        setSocket(null);
        return;
      }

      const next = io({ auth: { token } });
      socketRef.current = next;
      setSocket(next);
    }

    connectWithToken(getAccessToken());
    const unsubscribe = subscribeToAccessToken(connectWithToken);

    return () => {
      unsubscribe();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
