import { useRef, useCallback, useEffect, useState } from 'react';

type DataChannelState = 'closed' | 'open' | 'connecting';

interface UseDataChannelReturn {
  state: DataChannelState;
  send: (data: string) => void;
  lastMessage: string | null;
}

export function useDataChannel(
  onMessage?: (message: string) => void,
): UseDataChannelReturn {
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [state, setState] = useState<DataChannelState>('closed');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const send = useCallback((data: string) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(data);
    }
  }, []);

  // This hook is a lower-level interface for direct DataChannel access.
  // It will be wired up when WebRTCConnectionManager exposes the DC.

  return { state, send, lastMessage };
}
