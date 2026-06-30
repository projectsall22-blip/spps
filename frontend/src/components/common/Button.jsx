import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  variant = "primary", 
  isLoading = false, 
  disabled = false, 
  fullWidth = false,
  icon: Icon, // Lucide icon component
  className = "" 
}) => {
  
  // Base styles: 48px height for mobile (py-3) and clear typography
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-h-[48px] px-6";

  // Variant styles based on our School Design Palette
  const variants = {
    primary: "bg-primary text-white hover:bg-indigo-700 shadow-md",
    secondary: "bg-secondary text-white hover:bg-gray-700",
    danger: "bg-danger text-white hover:bg-red-700",
    outline: "border-2 border-primary text-primary hover:bg-primary/5",
    ghost: "text-secondary hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${fullWidth ? "w-full" : "w-auto"} 
        ${className}
      `}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color={variant === 'outline' ? 'primary' : 'white'} />
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon size={20} />}
          {children}
        </div>
      )}
    </button>
  );
};

export default Button;