import { useEffect, useState, useRef } from 'react';
import { useScroll, useTransform, MotionValue } from 'framer-motion';

// Hook for scroll-triggered animations
export function useScrollTrigger(threshold = 0.1) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  return { ref, isInView };
}

// Hook for parallax scrolling effects
export function useParallax(distance = 100) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, distance]);
  return y;
}

// Hook for scroll-based opacity
export function useScrollOpacity(range = [0, 500]) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, range, [1, 0]);
  return opacity;
}

// Hook for scroll-based scale
export function useScrollScale(range = [0, 500], scaleRange = [1, 0.8]) {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, range, scaleRange);
  return scale;
}

// Hook for advanced scroll animations with multiple properties
export function useAdvancedScroll() {
  const { scrollY, scrollYProgress } = useScroll();
  
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);
  const y = useTransform(scrollY, [0, 1000], [0, -200]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  
  return { scrollY, scrollYProgress, opacity, scale, y, rotate };
}

// Hook for sticky header with scroll effects
export function useStickyHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest: number) => {
      setIsScrolled(latest > 50);
    });

    return () => unsubscribe();
  }, [scrollY]);

  const headerOpacity = useTransform(scrollY, [0, 100], [0.95, 1]);
  const headerBlur = useTransform(scrollY, [0, 100], [0, 20]);

  return { isScrolled, headerOpacity, headerBlur };
}