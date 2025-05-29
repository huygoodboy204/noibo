import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients';
import EditClientModal from '../../components/EditClientModal';
import { Client } from '../../types/index';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const RANK_OPTIONS = ['A', 'B', 'C', 'D'];
const PHASE_OPTIONS = [
  'Prospecting', 'Qualification', 'Needs_Analysis', 'Proposal_Sent', 'Negotiation', 'Closed_Won', 'Closed_Lost', 'On_Hold'
];

const getBadgeColor = (rank: string) => {
  switch (rank) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
};

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'Closed_Won': return 'bg-green-600';
    case 'Closed_Lost': return 'bg-red-500';
    case 'On_Hold': return 'bg-yellow-500';
    default: return 'bg-blue-400';
  }
};

// Định nghĩa type mở rộng cho client có owner
interface ClientWithOwner extends Client {
  owner?: {
    full_name?: string;
    email?: string;
  };
}

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterRank, setFilterRank] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const {
    data: clients,
    loading,
    error,
    refresh,
    hasMore,
    totalCount,
    loadMore
  } = useClients();

  const handleAddClient = () => {
    navigate('/tables/clients/new');
  };

  const handleUpdateClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId) || null;
    setEditingClient(client);
  };

  const handleCloseEditModal = () => setEditingClient(null);

  const handleSaveEditClient = async (updatedClient: Client) => {
    setEditingClient(null);
    await refresh();
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa client này?')) {
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', clientId);

        if (error) throw error;

        toast.success('Xóa client thành công');
        await refresh();
      } catch (error: any) {
        console.error('Error deleting client:', error);
        toast.error(error.message || 'Không thể xóa client');
      }
    }
  };

  // Lấy danh sách unique cho filter dropdown
  const ownerOptions = Array.from(new Set((clients as ClientWithOwner[]).map(c => c.owner?.full_name).filter(Boolean)));
  const locationOptions = Array.from(new Set(clients.map(c => c.location).filter(Boolean)));
  const industryOptions = Array.from(new Set(clients.map(c => c.client_industry).filter(Boolean)));
  const categoryOptions = Array.from(new Set(clients.map(c => c.client_category).filter(Boolean)));

  const filteredClients = (clients as ClientWithOwner[]).filter(client =>
    (searchTerm === '' || client.client_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterRank === '' || client.client_rank === filterRank) &&
    (filterPhase === '' || client.phase === filterPhase) &&
    (filterOwner === '' || client.owner?.full_name === filterOwner) &&
    (filterLocation === '' || client.location === filterLocation) &&
    (filterIndustry === '' || client.client_industry === filterIndustry) &&
    (filterCategory === '' || client.client_category === filterCategory)
  );

  if (loading && !clients.length) {
    return <p>Loading clients...</p>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">Error loading clients: {error}</p>
        <button 
          onClick={refresh}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded min-w-[180px]"
          />
          <select value={filterRank} onChange={e => setFilterRank(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Ranks</option>
            {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Phases</option>
            {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filterOwner || ''} onChange={e => setFilterOwner(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Owners</option>
            {ownerOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterLocation || ''} onChange={e => setFilterLocation(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Locations</option>
            {locationOptions.map(l => <option key={l || ''} value={l || ''}>{l}</option>)}
          </select>
          <select value={filterIndustry || ''} onChange={e => setFilterIndustry(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Industries</option>
            {industryOptions.map(i => <option key={i || ''} value={i || ''}>{i}</option>)}
          </select>
          <select value={filterCategory || ''} onChange={e => setFilterCategory(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c || ''} value={c || ''}>{c}</option>)}
          </select>
          <button 
            onClick={refresh}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh
          </button>
          <button
            onClick={handleAddClient}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Client
          </button>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="text-center p-4">
          <p>No clients found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-6 mt-6">
            {filteredClients.map(client => (
              <div key={client.id} className="flex flex-col md:flex-row items-center bg-white rounded-2xl shadow-lg border border-pink-100 p-6 hover:shadow-2xl transition-shadow duration-200">
                {/* Avatar/logo */}
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-2xl font-bold mr-0 md:mr-6 mb-4 md:mb-0">
                  {client.client_name?.charAt(0) || 'C'}
                </div>
                {/* Thông tin chính */}
                <div className="flex-1 w-full md:w-auto">
                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <h2 className="text-xl font-bold text-pink-700 mr-2">{client.client_name}</h2>
                    {client.website_url && <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline text-sm">{client.website_url}</a>}
                    {client.client_industry && <span className="text-xs bg-pink-50 text-pink-500 rounded px-2 py-1 ml-0 md:ml-2">{client.client_industry}</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><i className="fas fa-user-tie text-pink-400"></i> Người sở hữu: <span className="font-semibold text-pink-700">{(client as ClientWithOwner).owner?.full_name || client.owner_id || 'N/A'}</span></span>
                    <span className="flex items-center gap-1"><i className="fas fa-star text-pink-400"></i> Xếp hạng: <span className="font-semibold text-pink-700">{client.client_rank || 'N/A'}</span></span>
                    <span className="flex items-center gap-1"><i className="fas fa-map-marker-alt text-pink-400"></i> Địa chỉ: {client.address || 'N/A'}</span>
                  </div>
                </div>
                {/* Thông tin phụ & badge trạng thái & nút xem chi tiết */}
                <div className="flex flex-col items-end gap-2 mt-4 md:mt-0 md:ml-6 w-full md:w-auto">
                  {client.phase && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold shadow-sm mb-2">{client.phase.replace(/_/g, ' ')}</span>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 text-sm"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                    <button
                      onClick={() => handleUpdateClient(client.id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-sm"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && !loading && (
            <div className="text-center mt-4">
              <button
                onClick={loadMore}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
      {loading && clients.length > 0 && (
        <p className="text-center mt-4 text-gray-600">
          Loading more clients...
        </p>
      )}
      {editingClient && (
        <EditClientModal
          client={editingClient}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditClient}
        />
      )}
    </div>
  );
};

export default ClientsPage; 