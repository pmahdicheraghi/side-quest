import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  delay: number;
  rot: number;
  char: string;
  color: string;
}

const SYMBOLS = ['✦', '★', '◆', '✚', '✦', '✶'];
const SPARK_COLORS = ['var(--game-accent, var(--acid))', 'var(--orange)', '#ffe57f', '#ffffff', 'var(--acid)'];

export function CelebrationBurst(): ReactElement | null {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const spreadX = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.85, 480) : 400;
    const items: Particle[] = Array.from({ length: 36 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * spreadX,
      y: (Math.random() - 0.5) * 320 - 180,
      scale: 0.8 + Math.random() * 1.0,
      delay: Math.random() * 0.55,
      rot: (Math.random() - 0.5) * 360,
      char: SYMBOLS[i % SYMBOLS.length],
      color: SPARK_COLORS[i % SPARK_COLORS.length],
    }));
    setParticles(items);

    const timer = window.setTimeout(() => setParticles([]), 3300);
    return () => window.clearTimeout(timer);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="celebration-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="celebration-spark"
          style={
            {
              '--target-x': `${p.x}px`,
              '--target-y': `${p.y}px`,
              '--scale': p.scale,
              '--delay': `${p.delay}s`,
              '--rot': `${p.rot}deg`,
              color: p.color,
            } as CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
