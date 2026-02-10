import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  fun?: boolean;
}

export const Card = ({ children, className = '', fun = false }: CardProps) => {
  return (
    <div className={`card ${fun ? 'card-fun' : ''} ${className}`}>
      {children}
    </div>
  );
};
