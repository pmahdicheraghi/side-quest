import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  delay: number;
  char: string;
}

const SYMBOLS = ['✦', '★', '◆', '✚', '✦'];

export function CelebrationBurst(): ReactElement | null {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 260,
      y: (Math.random() - 0.5) * 220 - 40,
      scale: 0.6 + Math.random() * 0.9,
      delay: Math.random() * 0.25,
      char: SYMBOLS[i % SYMBOLS.length],
    }));
    setParticles(items);

    const timer = window.setTimeout(() => setParticles([]), 3000);
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
            } as CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}
