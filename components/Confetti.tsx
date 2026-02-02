
import React, { useEffect, useState, useMemo, memo } from 'react';

export const Confetti: React.FC = memo(() => {
  const [pieces, setPieces] = useState<any[]>([]);

  // Memoize colors and shapes arrays
  const colors = useMemo(() => [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e',
    '#FFD700', '#FF69B4', '#00FFFF', '#FF4500', '#32CD32'
  ], []);
  
  const shapes = useMemo(() => ['circle', 'square', 'rect'], []);

  useEffect(() => {
    // Reduce pieces count on mobile for better performance
    const pieceCount = window.innerWidth < 640 ? 100 : 200;
    
    // Generate pieces with more natural physics variables
    const newPieces = Array.from({ length: pieceCount }).map((_, i) => {
      // Burst originates from bottom-center/middle
      // Angle: mostly upwards (between -PI/6 and -5PI/6)
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2; 
      const velocity = 40 + Math.random() * 40; // Initial burst speed
      
      const burstX = Math.cos(angle) * velocity;
      const burstY = Math.sin(angle) * velocity;
      
      return {
        id: i,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        delay: Math.random() * 0.15,
        duration: 3.5 + Math.random() * 2, // Slower fall
        rotationSpeed: (Math.random() - 0.5) * 720,
        swayAmplitude: 20 + Math.random() * 40,
        burstX,
        burstY,
      };
    });
    setPieces(newPieces);
  }, [colors, shapes]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            width: `${p.size}px`,
            height: p.shape === 'rect' ? `${p.size * 1.5}px` : `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            '--tx': `${p.burstX}vw`,
            '--ty': `${p.burstY}vh`,
            '--r': `${p.rotationSpeed}deg`,
            '--sway': `${p.swayAmplitude}px`,
            animation: `natural-fall ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) ${p.delay}s forwards`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes natural-fall {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0) rotateX(0) rotateY(0) rotateZ(0);
          }
          15% {
            opacity: 1;
            /* Burst out phase */
            transform: translate(var(--tx), var(--ty)) scale(1) rotateX(45deg) rotateY(45deg) rotateZ(45deg);
          }
          100% {
            opacity: 0;
            /* Gravity + Sway phase */
            transform: 
              translate(
                calc(var(--tx) + var(--sway)), 
                calc(100vh)
              ) 
              scale(0.8) 
              rotateX(var(--r)) 
              rotateY(var(--r)) 
              rotateZ(var(--r));
          }
        }
      `}</style>
    </div>
  );
});
