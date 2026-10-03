import React from 'react';
import {
  Activity,
  Cpu,
  Play,
  SlidersHorizontal,
  AlertCircle,
} from 'lucide-react';
import type { HealthResponse } from '../../types';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  health: HealthResponse | null;
  loadingHealth: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  health,
  loadingHealth,
}) => {
  const isBackendHealthy = health && health.status === 'ok';

  return (
    <header className="bg-white border-b border-industrial-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('overview')}>
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-industrial-950 font-sans">
                  IDLEWISE
                </span>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-emerald-200 uppercase tracking-wider">
                  Industrial Edition
                </span>
              </div>
              <p className="text-[11px] text-industrial-500 font-medium hidden sm:block">
                Energy-Aware Machine Idle-State Optimization
              </p>
            </div>
          </div>

          {/* Clean Industrial Main Navigation */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => onTabChange('overview')}
              className={`px-3 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-industrial-100 text-industrial-900 font-bold shadow-xs'
                  : 'text-industrial-600 hover:text-industrial-900 hover:bg-industrial-50'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => onTabChange('machines')}
              className={`px-3 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'machines'
                  ? 'bg-industrial-100 text-industrial-900 font-bold shadow-xs'
                  : 'text-industrial-600 hover:text-industrial-900 hover:bg-industrial-50'
              }`}
            >
              <Cpu className="w-4 h-4 text-industrial-700" />
              <span>Machines</span>
            </button>

            <button
              onClick={() => onTabChange('simulation')}
              className={`px-3 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'simulation'
                  ? 'bg-industrial-100 text-industrial-900 font-bold shadow-xs'
                  : 'text-industrial-600 hover:text-industrial-900 hover:bg-industrial-50'
              }`}
            >
              <Play className="w-4 h-4 text-indigo-600" />
              <span>Simulation</span>
            </button>

            <button
              onClick={() => onTabChange('insights')}
              className={`px-3 py-2 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-industrial-100 text-industrial-900 font-bold shadow-xs'
                  : 'text-industrial-600 hover:text-industrial-900 hover:bg-industrial-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Insights</span>
            </button>
          </nav>

          {/* Right: Operational Status Indicator */}
          <div className="flex items-center space-x-2">
            {loadingHealth ? (
              <span className="text-[11px] text-industrial-400 bg-industrial-100 px-2 py-1 rounded flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-industrial-400 animate-pulse"></span>
                <span>Connecting...</span>
              </span>
            ) : isBackendHealthy ? (
              <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded flex items-center space-x-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="hidden sm:inline">Engine Active</span>
              </span>
            ) : (
              <span className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded flex items-center space-x-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
