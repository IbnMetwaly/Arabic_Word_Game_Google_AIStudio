
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-amber-400 text-amber-900 hover:bg-amber-300",
    secondary: "bg-sky-400 text-sky-900 hover:bg-sky-300",
    success: "bg-emerald-500 text-white hover:bg-emerald-400",
    danger: "bg-rose-500 text-white hover:bg-rose-400"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
