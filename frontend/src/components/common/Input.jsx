import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  icon: Icon, 
  type = "text", 
  placeholder, 
  required = false,
  className = "",
  ...props 
}, ref) => {
  
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {/* Label Logic */}
      {label && (
        <label className="text-sm font-semibold text-secondary flex items-center gap-1">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Optional Icon at the start */}
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`
            w-full h-12 rounded-lg border-2 bg-white transition-colors duration-150 outline-none
            font-semibold text-gray-800 text-sm cursor-text
            ${Icon ? "pl-10 pr-4" : "px-4"}
            ${error 
              ? "border-danger focus:border-danger" 
              : "border-gray-200 focus:border-primary"
            }
            disabled:bg-gray-50 disabled:cursor-not-allowed
            placeholder:text-gray-400 placeholder:font-normal
          `}
          {...props}
        />
      </div>

      {/* Error Message Logic */}
      {error && (
        <p className="text-xs font-medium text-danger mt-0.5 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});

// For better debugging in React DevTools
Input.displayName = "Input";

export default Input;