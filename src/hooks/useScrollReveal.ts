import { useEffect, useRef, useState } from 'react';

/**
 * Apple-style scroll reveal hook.
 * Element starts invisible+shifted, animates to visible when scrolling into view.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options?: { delay?: number; threshold?: number }) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);
  const delay = options?.delay ?? 0;
  const threshold = options?.threshold ?? 0.15;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => setRevealed(true), delay);
          return () => clearTimeout(timer);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return { ref, revealed };
}
