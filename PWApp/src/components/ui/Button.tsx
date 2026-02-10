import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'normal' | 'big';
  children: ReactNode;
  loading?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'normal',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const baseClass = 'btn';
  const variantClass = variant === 'primary' ? 'btn-primary btn-shine' :
                      variant === 'secondary' ? 'btn-secondary' :
                      'btn-ghost';
  const sizeClass = size === 'big' ? 'btn-big' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
