
import React, { useEffect, useState } from 'react';

export const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#FCD34D', '#34D399', '#60A5FA', '#F87171', '#C084FC', '#FF8C00', '#FF1493'];
    const shapes = ['circle', 'square', 'triangle'];
    
    const newPieces = Array.from({ length: 200 }).map((_, i) => {
      const isBurst = i < 50; // First 50 burst from middle
      return {
        id: i,
        x: isBurst ? 50 : Math.random() * 100,
        y: isBurst ? 50 : -10 - Math.random() * 50,
        size: 5 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 4,
        angle: Math.random() * 360,
        sway: 5 + Math.random() * 15,
        burstX: (Math.random() - 0.5) * 100,
        burstY: (Math.random() - 0.5) * 100,
      };
    });
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}vh`,
            width: `${p.size}px`,
            height: p.shape === 'square' ? `${p.size}px` : p.shape === 'triangle' ? '0' : `${p.size}px`,
            backgroundColor: p.shape === 'triangle' ? 'transparent' : p.color,
            borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : 'none',
            borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : 'none',
            borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : 'none',
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            animation: `fall-dynamic ${p.duration}s linear ${p.delay}s infinite`,
            transform: `rotate(${p.angle}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall-dynamic {
          0% { 
            transform: translate(0, 0) rotate(0deg); 
            opacity: 1; 
          }
          20% {
            opacity: 1;
          }
          100% { 
            transform: translate(calc(var(--sway-x, 10px) * 1), 110vh) rotate(720deg); 
            opacity: 0; 
          }
        }
      `}</style>
    </div>
  );
};
