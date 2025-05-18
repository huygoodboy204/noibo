import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../../hooks/useClients';
import EditClientModal from '../../components/EditClientModal';
import { Client } from '../../types';

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

  // Lấy danh sách unique cho filter dropdown
  const ownerOptions = Array.from(new Set(clients.map(c => (c as any).owner?.full_name).filter(Boolean)));
  const locationOptions = Array.from(new Set(clients.map(c => (c as any).location).filter(Boolean)));
  const industryOptions = Array.from(new Set(clients.map(c => (c as any).client_industry).filter(Boolean)));
  const categoryOptions = Array.from(new Set(clients.map(c => (c as any).client_category).filter(Boolean)));

  const filteredClients = clients.filter(client =>
    (searchTerm === '' || client.client_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterRank === '' || (client as any).client_rank === filterRank) &&
    (filterPhase === '' || (client as any).phase === filterPhase) &&
    (filterOwner === '' || (client as any).owner?.full_name === filterOwner) &&
    (filterLocation === '' || (client as any).location === filterLocation) &&
    (filterIndustry === '' || (client as any).client_industry === filterIndustry) &&
    (filterCategory === '' || (client as any).client_category === filterCategory)
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
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Owners</option>
            {ownerOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Locations</option>
            {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Industries</option>
            {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-2 py-2 border rounded">
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <div key={client.id} className="rounded-xl shadow-lg bg-white p-6 flex flex-col gap-2 border hover:shadow-2xl transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-gray-800 flex-1">{client.client_name}</h3>
                  {(client as any).client_rank && (
                    <span className={`text-xs px-2 py-1 rounded-full text-white font-semibold ${getBadgeColor((client as any).client_rank)}`}>{(client as any).client_rank}</span>
                  )}
                  {(client as any).phase && (
                    <span className={`text-xs px-2 py-1 rounded-full text-white font-semibold ${getPhaseColor((client as any).phase)}`}>{(client as any).phase.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {(client as any).registration_no && <div><span className="font-semibold">Reg No:</span> {(client as any).registration_no}</div>}
                  {(client as any).website_url && <div><span className="font-semibold">Website:</span> <a href={(client as any).website_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{(client as any).website_url}</a></div>}
                  {(client as any).client_category && <div><span className="font-semibold">Category:</span> {(client as any).client_category}</div>}
                  {(client as any).client_industry && <div><span className="font-semibold">Industry:</span> {(client as any).client_industry}</div>}
                  {(client as any).location && <div><span className="font-semibold">Location:</span> {(client as any).location}</div>}
                  {(client as any).address && <div><span className="font-semibold">Address:</span> {(client as any).address}</div>}
                  {(client as any).business_overview && <div className="md:col-span-2"><span className="font-semibold">Business Overview:</span> {(client as any).business_overview}</div>}
                  {(client as any).working_hours && <div><span className="font-semibold">Working Hours:</span> {(client as any).working_hours}</div>}
                  {(client as any).insurance && <div><span className="font-semibold">Insurance:</span> {(client as any).insurance}</div>}
                  {(client as any).medical_expense && <div><span className="font-semibold">Medical Expense:</span> {(client as any).medical_expense}</div>}
                  {(client as any).bonus && <div><span className="font-semibold">Bonus:</span> {(client as any).bonus}</div>}
                  {(client as any).allowance && <div><span className="font-semibold">Allowance:</span> {(client as any).allowance}</div>}
                  {(client as any).sick_leave && <div><span className="font-semibold">Sick Leave:</span> {(client as any).sick_leave}</div>}
                  {(client as any).annual_leave && <div><span className="font-semibold">Annual Leave:</span> {(client as any).annual_leave}</div>}
                  {(client as any).probation_period && <div><span className="font-semibold">Probation Period:</span> {(client as any).probation_period}</div>}
                  {(client as any).phase_date && <div><span className="font-semibold">Phase Date:</span> {(client as any).phase_date}</div>}
                  {(client as any).phase_memo && <div className="md:col-span-2"><span className="font-semibold">Phase Memo:</span> {(client as any).phase_memo}</div>}
                  {(client as any).created_by_id && <div><span className="font-semibold">Created By:</span> {(client as any).created_by_id}</div>}
                  {(client as any).updated_by_id && <div><span className="font-semibold">Updated By:</span> {(client as any).updated_by_id}</div>}
                  {(client as any).created_at && <div><span className="font-semibold">Created:</span> {new Date((client as any).created_at).toLocaleString()}</div>}
                  {(client as any).updated_at && <div><span className="font-semibold">Updated:</span> {new Date((client as any).updated_at).toLocaleString()}</div>}
                  {(client as any).owner_id && <div><span className="font-semibold">Owner:</span> {(client as any).owner?.full_name || (client as any).owner_id}</div>}
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleUpdateClient(client.id)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                  >
                    Edit
                  </button>
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