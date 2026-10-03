import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
  return (
    <div className="bg-white border border-industrial-200 rounded-lg p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
      <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-industrial-900">Page Not Found</h2>
      <p className="text-sm text-industrial-500 mt-2">
        The requested screen does not exist or has not yet been unlocked in this prototype phase.
      </p>
      <button
        onClick={onGoHome}
        className="mt-6 inline-flex items-center space-x-2 px-4 py-2 border border-industrial-300 rounded-md text-sm font-medium text-industrial-700 bg-white hover:bg-industrial-50 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 text-industrial-500" />
        <span>Return to Overview</span>
      </button>
    </div>
  );
};
