import { useState, useCallback } from 'react';

/**
 * useApi — a minimal hook to handle async API calls with loading/error state.
 *
 * Usage:
 *   const { loading, error, execute } = useApi();
 *   const data = await execute(() => API.get('/some/endpoint'));
 */
const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (apiCall) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiCall();
            return result;
        } catch (err) {
            setError(err.message || 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return { loading, error, execute, clearError };
};

export default useApi;