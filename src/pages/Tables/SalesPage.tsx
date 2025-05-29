import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../hooks/useSales';
import { toast } from 'react-toastify';

const PAYMENT_STATUS_OPTIONS = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];

interface SaleClientInfo { id: string; client_name: string | null; }
interface SaleJobInfo { id: string; position_title: string | null; }
interface SaleCandidateInfo { id: string; name: string | null; }
interface SaleHandlerInfo { id: string; full_name: string | null; }

interface SaleDisplay {
  id: string;
  process_id: string | null;
  fee_amount: number | null;
  payment_status: string | null;
  invoice_date: string | null;
  client: SaleClientInfo | null;
  job: SaleJobInfo | null;
  candidate: SaleCandidateInfo | null;
  handler: SaleHandlerInfo | null;
}

const SalesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const {
    data: sales,
    loading,
    error,
    hasMore,
    totalCount,
    page,
    setPage,
    refresh
  } = useSales();

  const handleAddSale = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add a new sale');
      return;
    }
    navigate('/tables/sales/add');
  };

  const handleUpdateSale = (saleId: string) => {
    toast.info('Update sale functionality coming soon!');
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' || 
      sale.client?.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.job?.position_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.candidate?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === '' || sale.payment_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="mt-2 text-gray-600">Track and manage all your sales transactions in one place</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header with Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by client, job, or candidate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                />
              </div>
              <div className="w-full md:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                >
                  <option value="">All Status</option>
                  {PAYMENT_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={refresh}
                className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </button>
              <button
                onClick={handleAddSale}
                className="px-4 py-2.5 bg-blue-600 rounded-lg text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Sale
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sales Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-700">
            <span className="font-medium">{totalCount}</span> total sales found
          </div>
        </div>

        {loading && sales.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading sales...</p>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[400px] bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-red-500 mb-4">Error: {error}</div>
            <button 
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition duration-150"
            >
              Try Again
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="min-h-[400px] bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500">No sales found matching your criteria.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition duration-150">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{sale.client?.client_name || 'N/A'}</h3>
                      <p className="text-sm text-gray-600">{sale.job?.position_title || 'N/A'}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      sale.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                      sale.payment_status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      sale.payment_status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.payment_status || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Candidate:</span>
                      <span className="font-medium text-gray-900">{sale.candidate?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fee Amount:</span>
                      <span className="font-medium text-gray-900">
                        {sale.fee_amount ? `$${sale.fee_amount.toLocaleString()}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-medium text-gray-900">
                        {sale.invoice_date ? new Date(sale.invoice_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handler:</span>
                      <span className="font-medium text-gray-900">{sale.handler?.full_name || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleUpdateSale(sale.id)}
                      className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-medium transition duration-150"
                    >
                      Edit Sale
                    </button>
                  </div>
                </div>
              </div>
              ))}
        </div>
      )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={() => setPage(page + 1)}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
            >
              {loading ? 'Loading...' : 'Load More Sales'}
              </button>
            </div>
        )}

        {/* Loading More Indicator */}
        {loading && sales.length > 0 && (
          <div className="text-center mt-6 text-gray-600">
            Loading more sales...
          </div>
      )}
      </div>
    </div>
  );
};

export default SalesPage; 