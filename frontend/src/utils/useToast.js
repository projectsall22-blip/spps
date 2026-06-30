import { useState, useCallback } from 'react';

/**
 * useToast — minimal hook for showing toast notifications.
 *
 * Usage:
 *   const { toast, showToast, hideToast } = useToast();
 *   showToast('Saved successfully', 'success');
 *   showToast('Something went wrong', 'error');
 *
 *   // In JSX:
 *   {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
 */
const useToast = (autoDismissMs = 3500) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        if (autoDismissMs > 0) {
            setTimeout(() => setToast(null), autoDismissMs);
        }
    }, [autoDismissMs]);

    const hideToast = useCallback(() => setToast(null), []);

    return { toast, showToast, hideToast };
};

export default useToast;