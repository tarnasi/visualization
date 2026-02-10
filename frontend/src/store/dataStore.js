import { create } from 'zustand';

const useDataStore = create((set, get) => ({
  // State
  historicalData: [],
  realtimeData: [],
  statistics: null,
  dateRange: { start: null, end: null },
  depthRange: { min: 0, max: 0 },
  loadingHistorical: false,
  loadingStatistics: false,
  error: null,
  
  // Actions
  setHistoricalData: (data) => set({ historicalData: data }),
  
  addRealtimeData: (newData) => set((state) => {
    const updated = [...state.realtimeData, newData];
    // Keep only last 1000 points
    const trimmed = updated.length > 1000 ? updated.slice(-1000) : updated;
    return { realtimeData: trimmed };
  }),
  
  clearRealtimeData: () => set({ realtimeData: [] }),
  
  setStatistics: (stats) => set({ statistics: stats }),
  
  setDateRange: (start, end) => set({ 
    dateRange: { start, end } 
  }),
  
  setDepthRange: (min, max) => set({ 
    depthRange: { min, max } 
  }),
  
  setLoadingHistorical: (loading) => set({ loadingHistorical: loading }),
  
  setLoadingStatistics: (loading) => set({ loadingStatistics: loading }),
  
  setError: (error) => set({ error }),
  
  // Getters
  getCombinedData: () => {
    const state = get();
    return [...state.historicalData, ...state.realtimeData];
  },
  
  getFilteredData: () => {
    const state = get();
    const combined = [...state.historicalData, ...state.realtimeData];
    
    let filtered = combined;
    
    // Apply date range filter
    if (state.dateRange.start && state.dateRange.end) {
      const startTime = new Date(state.dateRange.start).getTime();
      const endTime = new Date(state.dateRange.end).getTime();
      
      filtered = filtered.filter(d => {
        const time = new Date(d.time).getTime();
        return time >= startTime && time <= endTime;
      });
    }
    
    // Apply depth range filter
    if (state.depthRange.min !== 0 || state.depthRange.max !== 0) {
      filtered = filtered.filter(d => 
        d.depth >= state.depthRange.min && 
        d.depth <= state.depthRange.max
      );
    }
    
    return filtered;
  },
  
  getDataCount: () => {
    const state = get();
    return state.historicalData.length + state.realtimeData.length;
  },
  
  resetStore: () => set({
    historicalData: [],
    realtimeData: [],
    statistics: null,
    dateRange: { start: null, end: null },
    depthRange: { min: 0, max: 0 },
    loadingHistorical: false,
    loadingStatistics: false,
    error: null
  })
}));

export default useDataStore;
