import React from 'react';
import { X, Info } from 'lucide-react';

interface UpdateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: string;
}

export const UpdateDetailsModal: React.FC<UpdateDetailsModalProps> = ({
  isOpen,
  onClose,
  details,
}) => {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              جزئیات آپدیت
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {details}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className=" btn-primary"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
