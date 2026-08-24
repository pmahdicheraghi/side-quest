import anime from 'animejs';
import { loadSettings } from './settings';

export function motionEnabled(): boolean {
  return (
    loadSettings().animations && (typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}

export function animateIn(selector: string): void {
  if (!motionEnabled()) return;
  anime({ targets: selector, opacity: [0, 1], translateY: [14, 0], delay: anime.stagger(55), duration: 520, easing: 'easeOutCubic' });
}
