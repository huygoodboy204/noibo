import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

// Enum cho process status từ DB schema
const PROCESS_STATUS_OPTIONS = [
  'APPLIED',
  'CV_SUBMITTED_TO_CLIENT',
  'INTERVIEW_SCHEDULED_1ST',
  'INTERVIEW_COMPLETED_1ST',
  'INTERVIEW_SCHEDULED_2ND',
  'INTERVIEW_COMPLETED_2ND',
  'INTERVIEW_SCHEDULED_FINAL',
  'INTERVIEW_COMPLETED_FINAL',
  'TEST_ASSIGNED',
  'TEST_COMPLETED',
  'REFERENCE_CHECK_IN_PROGRESS',
  'REFERENCE_CHECK_COMPLETED',
  'OFFER_EXTENDED',
  'OFFER_ACCEPTED_BY_CANDIDATE',
  'OFFER_DECLINED_BY_CANDIDATE',
  'REJECTED_BY_CLIENT',
  'CANDIDATE_WITHDREW',
  'PLACEMENT_CONFIRMED',
  'ONBOARDING',
  'GUARANTEE_PERIOD',
  'PROCESS_ON_HOLD',
  'PROCESS_CANCELLED'
] as const;

interface ProcessStatusSelectProps {
  processId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
}

const ProcessStatusSelect: React.FC<ProcessStatusSelectProps> = ({
  processId,
  currentStatus,
  onStatusChange,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value;
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('processes')
        .update({
          process_status: newStatus,
          status_update_date: new Date().toISOString()
        })
        .eq('id', processId);

      if (updateError) throw updateError;

      // Gọi callback nếu có
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (err) {
      console.error('Error updating process status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Format status text để hiển thị
  const formatStatusText = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Xác định màu sắc cho status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return 'bg-blue-100 text-blue-800';
      case 'CV_SUBMITTED_TO_CLIENT':
        return 'bg-purple-100 text-purple-800';
      case 'INTERVIEW_SCHEDULED_1ST':
      case 'INTERVIEW_SCHEDULED_2ND':
      case 'INTERVIEW_SCHEDULED_FINAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'INTERVIEW_COMPLETED_1ST':
      case 'INTERVIEW_COMPLETED_2ND':
      case 'INTERVIEW_COMPLETED_FINAL':
        return 'bg-green-100 text-green-800';
      case 'OFFER_EXTENDED':
        return 'bg-indigo-100 text-indigo-800';
      case 'OFFER_ACCEPTED_BY_CANDIDATE':
      case 'PLACEMENT_CONFIRMED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED_BY_CLIENT':
      case 'OFFER_DECLINED_BY_CANDIDATE':
      case 'PROCESS_CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'PROCESS_ON_HOLD':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      <select
        value={currentStatus}
        onChange={handleStatusChange}
        disabled={disabled || loading}
        className={`w-full p-2 rounded border ${getStatusColor(currentStatus)} 
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        {PROCESS_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {formatStatusText(status)}
          </option>
        ))}
      </select>
      
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default ProcessStatusSelect; 