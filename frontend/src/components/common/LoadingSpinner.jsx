import React from 'react';

const LoadingSpinner = ({ size = "md", color = "primary" }) => {
  // Define sizes for different use cases
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  // Define colors based on our Tailwind config
  const colors = {
    primary: "border-primary/30 border-t-primary",
    white: "border-white/30 border-t-white",
    success: "border-success/30 border-t-success",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`
          ${sizes[size]} 
          ${colors[color]} 
          rounded-full 
          animate-spin
        `}
      />
    </div>
  );
};

export default LoadingSpinner;