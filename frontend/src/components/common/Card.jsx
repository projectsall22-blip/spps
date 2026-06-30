import React from 'react';

const Card = ({ 
  children, 
  title, 
  subtitle,
  icon: Icon, 
  footer, 
  className = "",
  noPadding = false 
}) => {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Header Section */}
      {(title || Icon) && (
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-indigo-50 text-primary rounded-lg">
                <Icon size={20} />
              </div>
            )}
            <div>
              <h3 className="font-bold text-gray-800 leading-none">{title}</h3>
              {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Body Section */}
      <div className={`${noPadding ? "p-0" : "p-5 md:p-6"}`}>
        {children}
      </div>

      {/* Footer Section */}
      {footer && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;