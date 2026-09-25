import { useEffect, useState } from 'react';

export function useCountdown(expiresAt: string | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setLabel(null);
      return;
    }

    const target = expiresAt;

    function tick() {
      const remainingMs = new Date(target).getTime() - Date.now();
      if (remainingMs <= 0) {
        setLabel('00:00');
        return;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      setLabel(`${minutes}:${seconds}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return label;
}
