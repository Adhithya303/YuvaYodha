import type {
  Machine,
  Job,
  HealthResponse,
  SimulationScenario,
  SimulationRunRequest,
  SimulationResult,
  SimulationRun,
  Telemetry,
  Decision,
  StrategyComparisonRequest,
  StrategyComparisonResponse,
  PlaybackResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: res.statusText };
      }
      const message = errorData?.detail || `API request failed with status ${res.status}`;
      throw new ApiError(res.status, message, errorData);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err.message || 'Network connection failed');
  }
}

export const api = {
  getHealth: (): Promise<HealthResponse> => {
    return request<HealthResponse>('/health');
  },

  getMachines: (): Promise<Machine[]> => {
    return request<Machine[]>('/machines');
  },

  getMachineById: (id: string): Promise<Machine> => {
    return request<Machine>(`/machines/${id}`);
  },

  getJobs: (): Promise<Job[]> => {
    return request<Job[]>('/jobs');
  },

  getJobById: (id: string): Promise<Job> => {
    return request<Job>(`/jobs/${id}`);
  },

  // ===========================================================================
  // SIMULATION ENDPOINTS (Prompt 2)
  // ===========================================================================

  getScenarios: (): Promise<SimulationScenario[]> => {
    return request<SimulationScenario[]>('/simulations/scenarios');
  },

  runSimulation: (req: SimulationRunRequest): Promise<SimulationResult> => {
    return request<SimulationResult>('/simulations/run', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getSimulations: (limit: number = 20): Promise<SimulationRun[]> => {
    return request<SimulationRun[]>(`/simulations?limit=${limit}`);
  },

  getSimulationById: (id: string): Promise<SimulationRun> => {
    return request<SimulationRun>(`/simulations/${id}`);
  },

  getSimulationTelemetry: (id: string, machineId?: string): Promise<Telemetry[]> => {
    const query = machineId ? `?machine_id=${encodeURIComponent(machineId)}` : '';
    return request<Telemetry[]>(`/simulations/${id}/telemetry${query}`);
  },

  getSimulationDecisions: (id: string, machineId?: string): Promise<Decision[]> => {
    const query = machineId ? `?machine_id=${encodeURIComponent(machineId)}` : '';
    return request<Decision[]>(`/simulations/${id}/decisions${query}`);
  },

  compareSimulations: (req: StrategyComparisonRequest): Promise<StrategyComparisonResponse> => {
    return request<StrategyComparisonResponse>('/simulations/compare', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  getSimulationPlayback: (
    id: string,
    startMinute?: number,
    endMinute?: number
  ): Promise<PlaybackResponse> => {
    const params = new URLSearchParams();
    if (startMinute !== undefined) params.append('start_minute', startMinute.toString());
    if (endMinute !== undefined) params.append('end_minute', endMinute.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<PlaybackResponse>(`/simulations/${id}/playback${query}`);
  },

  getSimulationStreamUrl: (id: string, speed: number = 60): string => {
    return `${API_BASE_URL}/simulations/${id}/stream?speed=${speed}`;
  },
};

