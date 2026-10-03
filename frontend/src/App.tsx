import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { MachinesPage } from './pages/MachinesPage';
import { SimulationPage } from './pages/SimulationPage';
import { InsightsPage } from './pages/InsightsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { api } from './services/api';
import type { Machine, HealthResponse } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState<boolean>(true);
  const [machinesError, setMachinesError] = useState<string | null>(null);
  const [simulationSeekMinute, setSimulationSeekMinute] = useState<number | null>(null);

  // Fetch health check status
  const checkHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  // Fetch machines list
  const loadMachines = useCallback(async () => {
    setLoadingMachines(true);
    setMachinesError(null);
    try {
      const data = await api.getMachines();
      setMachines(data);
    } catch (err: any) {
      setMachinesError(err.message || 'Failed to connect to backend service.');
    } finally {
      setLoadingMachines(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadMachines();

    // Check health periodically every 15s
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, loadMachines]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-industrial-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        health={health}
        loadingHealth={loadingHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewPage
            health={health}
            machineCount={machines.length}
            loading={loadingMachines}
            onNavigateToMachines={() => setActiveTab('machines')}
            onNavigateToSimulation={(seekMinute?: number) => {
              if (seekMinute !== undefined) {
                setSimulationSeekMinute(seekMinute);
              }
              setActiveTab('simulation');
            }}
          />
        )}

        {activeTab === 'machines' && (
          <MachinesPage
            machines={machines}
            loading={loadingMachines}
            error={machinesError}
            onRefresh={loadMachines}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationPage
            initialSeekMinute={simulationSeekMinute}
            onClearInitialSeekMinute={() => setSimulationSeekMinute(null)}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsPage
            onSeekToSimulation={(minute) => {
              setSimulationSeekMinute(minute);
              setActiveTab('simulation');
            }}
          />
        )}

        {activeTab !== 'overview' &&
          activeTab !== 'machines' &&
          activeTab !== 'simulation' &&
          activeTab !== 'insights' && (
            <NotFoundPage onGoHome={() => setActiveTab('overview')} />
          )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-industrial-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-industrial-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-industrial-800">IdleWise</span>
            <span>•</span>
            <span>Schneider Electric Hackathon Challenge 4: Smart Manufacturing</span>
          </div>
          <div className="text-[11px] text-industrial-500 text-center sm:text-right">
            IdleWise is a software simulation and decision-support prototype using synthetic manufacturing data. It does not directly control industrial equipment.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
