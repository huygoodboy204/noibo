import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { supabase } from '../../supabaseClient'; // supabase không được dùng ở đây

interface ApplyJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string; // Changed from number to string to accept UUIDs
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ isOpen, onClose, jobId }) => {
  const navigate = useNavigate();
  // const [loading, setLoading] = useState(false); // loading không được dùng
  // const [error, setError] = useState<string | null>(null); // error không được dùng

  if (!isOpen) return null;

  const handleExistingCandidate = () => {
    navigate('/candidates', { 
      state: { 
        fromApply: true, 
        jobId: jobId 
      } 
    });
  };

  const handleNewCandidate = () => {
    navigate('/candidates/add', {
      state: {
        fromApply: true,
        jobId: jobId
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Apply for Job</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error display was removed as error state is not used */}
        {/* {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )} */}

        <div className="space-y-4">
          <button
            onClick={handleExistingCandidate}
            // disabled={loading} // loading state not used
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded transition duration-200"
          >
            Apply with Existing Candidate
          </button>

          <div className="text-center text-gray-500">or</div>

          <button
            onClick={handleNewCandidate}
            // disabled={loading} // loading state not used
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded transition duration-200"
          >
            Add New Candidate
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyJobModal;
// Ensure ApplyJobModalProps is exported if JobsPage needs to import it by name
// (though it won't if ApplyJobModal is default export and props are inferred or explicitly typed in JobsPage)
// Nếu JobsPage import { ApplyJobModalProps }, thì cần export nó:
export type { ApplyJobModalProps }; 