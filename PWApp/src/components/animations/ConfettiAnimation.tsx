import { useEffect, useState } from 'react';

interface Confetti {
  id: number;
  left: number;
  backgroundColor: string;
  animationDelay: string;
}

export const ConfettiAnimation = () => {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#51CF66', '#667EEA', '#F093FB'];
    const pieces: Confetti[] = [];

    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        animationDelay: `${Math.random() * 3}s`
      });
    }

    setConfetti(pieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.backgroundColor,
            animationDelay: piece.animationDelay
          }}
        />
      ))}
    </div>
  );
};
