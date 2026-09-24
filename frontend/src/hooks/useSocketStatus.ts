import { useEffect, useState } from 'react';
import {
  getSocketStatus,
  SocketStatus,
  subscribeSocketStatus,
} from '../lib/socket';

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(getSocketStatus);

  useEffect(() => subscribeSocketStatus(setStatus), []);

  return status;
}