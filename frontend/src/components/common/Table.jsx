import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Table = ({ 
  headers = [], 
  children, 
  isLoading = false, 
  emptyMessage = "No data found",
  count = 0
}) => {
  return (
    <div className="w-full">
      {/* Table Container with Horizontal Scroll for Mobile */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {headers.map((header, index) => (
                  <th 
                    key={index} 
                    className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={headers.length} className="py-20">
                    <LoadingSpinner size="lg" />
                    <p className="text-center text-secondary text-sm mt-4">Loading data...</p>
                  </td>
                </tr>
              ) : count === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-gray-50 p-4 rounded-full mb-4">📂</div>
                      <p className="text-secondary font-medium">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                children
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Footer/Pagination Area */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-secondary font-medium">
            Showing <span className="text-gray-900">{count}</span> entries
          </p>
        </div>
      </div>
    </div>
  );
};

export default Table;