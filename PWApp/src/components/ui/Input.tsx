import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
