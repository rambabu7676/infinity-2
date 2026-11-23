import React, { useRef, useState, useEffect, useCallback } from 'react';

export type RefreshResultStatus = 'updated' | 'no-new' | 'offline';

interface UsePullToRefreshOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRefresh?: () => Promise<RefreshResultStatus>;
}

const PULL_THRESHOLD = 46;
const MAX_PULL_DISTANCE = 80;
const DAMPING_FACTOR = 0.48;

export function usePullToRefresh({ containerRef, onRefresh }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offlineError, setOfflineError] = useState(false);

  const isPullingRef = useRef(false);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const offlineTimerRef = useRef<number | null>(null);

  isRefreshingRef.current = isRefreshing;

  useEffect(() => {
    return () => {
      if (offlineTimerRef.current) {
        window.clearTimeout(offlineTimerRef.current);
      }
    };
  }, []);

  const isAtTop = useCallback(() => {
    const elScrollTop = containerRef.current?.scrollTop ?? 0;
    const winScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    return elScrollTop <= 1 && winScrollY <= 1;
  }, [containerRef]);

  const showOfflineNotice = useCallback(() => {
    setOfflineError(true);
    if (offlineTimerRef.current) {
      window.clearTimeout(offlineTimerRef.current);
    }
    offlineTimerRef.current = window.setTimeout(() => {
      setOfflineError(false);
    }, 3000);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshingRef.current) {
      pullDistanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setPullDistance(48);
    pullDistanceRef.current = 48;
    setOfflineError(false);

    const startedAt = Date.now();
    let status: RefreshResultStatus = 'no-new';

    try {
      status = await onRefresh();
    } catch {
      status = 'offline';
    }

    const elapsed = Date.now() - startedAt;
    if (elapsed < 350) {
      await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
    }

    isRefreshingRef.current = false;
    setIsRefreshing(false);
    pullDistanceRef.current = 0;
    setPullDistance(0);

    if (status === 'offline') {
      showOfflineNotice();
    }
  }, [onRefresh, showOfflineNotice]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!onRefresh || isRefreshingRef.current || e.touches.length !== 1) return;
      if (!isAtTop()) return;
      isPullingRef.current = true;
      startYRef.current = e.touches[0].clientY;
    },
    [isAtTop, onRefresh]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      if (!isAtTop()) {
        isPullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const deltaY = e.touches[0].clientY - startYRef.current;
      if (deltaY > 0) {
        const nextDist = Math.min(MAX_PULL_DISTANCE, deltaY * DAMPING_FACTOR);
        pullDistanceRef.current = nextDist;
        setPullDistance(nextDist);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    },
    [isAtTop]
  );

  const finishPull = useCallback(() => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      void triggerRefresh();
    } else {
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }
  }, [triggerRefresh]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onRefresh || isRefreshingRef.current || e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select')) return;
      if (!isAtTop()) return;
      isPullingRef.current = true;
      startYRef.current = e.clientY;
    },
    [isAtTop, onRefresh]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      if ((e.buttons & 1) !== 1) {
        finishPull();
        return;
      }
      if (!isAtTop()) {
        isPullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const deltaY = e.clientY - startYRef.current;
      if (deltaY > 10) {
        const nextDist = Math.min(MAX_PULL_DISTANCE, (deltaY - 10) * DAMPING_FACTOR);
        pullDistanceRef.current = nextDist;
        setPullDistance(nextDist);
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    },
    [finishPull, isAtTop]
  );

  return {
    pullDistance,
    isRefreshing,
    offlineError,
    pullHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: finishPull,
      onTouchCancel: finishPull,
      onMouseDown,
      onMouseMove,
      onMouseUp: finishPull,
      onMouseLeave: finishPull,
    },
  };
}
