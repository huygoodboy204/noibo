import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModalLayout } from '../../contexts/ModalLayoutContext';

interface ApplyJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string;
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ isOpen, onClose, jobId, jobTitle }) => {
  const navigate = useNavigate();
  const { setIsModalOpen } = useModalLayout();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set modal state when component mounts/unmounts
  React.useEffect(() => {
    setIsModalOpen(isOpen);
    return () => setIsModalOpen(false);
  }, [isOpen, setIsModalOpen]);

  if (!isOpen) return null;

  const handleExistingCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      navigate('/tables/candidates', { 
        state: { 
          fromApply: true, 
          jobId: jobId,
          jobTitle: jobTitle
        } 
      });
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi chuyển trang');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      navigate('/tables/candidates/new', {
        state: {
          fromApply: true,
          jobId: jobId,
          jobTitle: jobTitle
        }
      });
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi chuyển trang');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Ứng tuyển vị trí</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            <div className="flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleExistingCandidate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-user-check"></i>
                <span>Chọn ứng viên hiện có</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">hoặc</span>
            </div>
          </div>

          <button
            onClick={handleNewCandidate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                <span>Thêm ứng viên mới</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Bạn có thể chọn ứng viên từ danh sách hiện có hoặc thêm ứng viên mới vào hệ thống.</p>
        </div>
      </div>
    </div>
  );
};

export default ApplyJobModal;
export type { ApplyJobModalProps }; 