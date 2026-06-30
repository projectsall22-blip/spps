import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ 
  message, 
  type = "success", 
  onClose 
}) => {
  const configs = {
    success: { icon: CheckCircle, bg: "bg-green-50", text: "text-success", border: "border-green-100" },
    error: { icon: AlertCircle, bg: "bg-red-50", text: "text-danger", border: "border-red-100" },
    info: { icon: Info, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  };

  const { icon: Icon, bg, text, border } = configs[type];

  return (
    <div className={`
      fixed top-5 left-1/2 -translate-x-1/2 z-[100]
      flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
      min-w-[300px] max-w-[90vw]
      ${bg} ${text} ${border}
      animate-in slide-in-from-top-10 duration-300
    `}>
      <Icon size={20} className="shrink-0" />
      <p className="text-sm font-bold flex-grow">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;