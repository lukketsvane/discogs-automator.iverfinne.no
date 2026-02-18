import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

export function useSwipeDown(onDismiss: () => void, threshold = 80): SwipeHandlers {
  const startY = useRef(0);
  const currentY = useRef(0);
  const sheetEl = useRef<HTMLElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    sheetEl.current = e.currentTarget as HTMLElement;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const dy = currentY.current - startY.current;
    if (dy > 0 && sheetEl.current) {
      sheetEl.current.style.transform = `translateY(${dy}px)`;
      sheetEl.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const dy = currentY.current - startY.current;
    if (sheetEl.current) {
      if (dy > threshold) {
        sheetEl.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        sheetEl.current.style.transform = 'translateY(100%)';
        setTimeout(onDismiss, 300);
      } else {
        sheetEl.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        sheetEl.current.style.transform = 'translateY(0)';
      }
    }
  }, [onDismiss, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export function useSwipeBack(onBack: () => void, threshold = 80): SwipeHandlers {
  const startX = useRef(0);
  const currentX = useRef(0);
  const el = useRef<HTMLElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX > 30) return;
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    el.current = e.currentTarget as HTMLElement;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current === 0) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    if (dx > 0 && el.current) {
      const progress = Math.min(dx / 300, 1);
      el.current.style.transform = `translateX(${dx}px)`;
      el.current.style.opacity = `${1 - progress * 0.3}`;
      el.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    const dx = currentX.current - startX.current;
    if (el.current) {
      if (dx > threshold) {
        el.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
        el.current.style.transform = 'translateX(100%)';
        el.current.style.opacity = '0';
        setTimeout(onBack, 250);
      } else {
        el.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease';
        el.current.style.transform = 'translateX(0)';
        el.current.style.opacity = '1';
      }
    }
    startX.current = 0;
  }, [onBack, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// iOS-style swipe-to-reveal actions on list items
export function useSwipeAction(onAction?: () => void) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const el = useRef<HTMLElement | null>(null);
  const isSwiping = useRef(false);
  const isOpen = useRef(false);
  const ACTION_WIDTH = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    el.current = e.currentTarget.querySelector('.swipe-card-content') as HTMLElement;
    if (el.current) {
      el.current.classList.add('swiping');
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!el.current) return;
    currentX.current = e.touches[0].clientX;
    let dx = currentX.current - startX.current;

    // If already open, offset from open position
    if (isOpen.current) {
      dx = dx - ACTION_WIDTH;
    }

    // Clamp: don't go right past origin, don't go left past ACTION_WIDTH * 1.5
    dx = Math.max(-ACTION_WIDTH * 1.5, Math.min(0, dx));

    if (dx < -5) {
      isSwiping.current = true;
      e.preventDefault();
    }

    el.current.style.transform = `translateX(${dx}px)`;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!el.current) return;
    el.current.classList.remove('swiping');

    const dx = currentX.current - startX.current;
    const adjustedDx = isOpen.current ? dx - ACTION_WIDTH : dx;

    if (adjustedDx < -ACTION_WIDTH * 1.2) {
      // Swiped far enough for delete action
      el.current.style.transform = `translateX(-100%)`;
      if (onAction) setTimeout(onAction, 250);
      isOpen.current = false;
    } else if (adjustedDx < -(ACTION_WIDTH * 0.4)) {
      // Open to reveal actions
      el.current.style.transform = `translateX(-${ACTION_WIDTH}px)`;
      isOpen.current = true;
    } else {
      // Snap back closed
      el.current.style.transform = 'translateX(0)';
      isOpen.current = false;
    }

    isSwiping.current = false;
  }, [onAction]);

  const close = useCallback(() => {
    if (el.current) {
      el.current.style.transform = 'translateX(0)';
      isOpen.current = false;
    }
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, close };
}
