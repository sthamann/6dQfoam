import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { GAParameters } from "@shared/schema";

export function useGeneticAlgorithm() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for status updates via WebSocket to sync running state
  const updateRunningStatus = (status: string) => {
    setIsRunning(status === 'running');
  };

  const startGA = async (parameters: GAParameters) => {
    try {
      setError(null);
      setIsRunning(true);
      
      const response = await apiRequest("POST", "/api/genetic-algorithm/start", parameters);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      console.log("GA started successfully:", result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start GA";
      setError(errorMessage);
      setIsRunning(false);
      throw err;
    }
  };

  const stopGA = async () => {
    try {
      setError(null);
      
      const response = await apiRequest("POST", "/api/genetic-algorithm/stop");
      const result = await response.json();
      
      setIsRunning(false);
      console.log("GA stopped:", result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to stop GA";
      setError(errorMessage);
      throw err;
    }
  };

  const exportResults = async () => {
    try {
      setError(null);
      
      const response = await apiRequest("GET", "/api/genetic-algorithm/export");
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lagrangian_candidates_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log("Results exported successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export results";
      setError(errorMessage);
      throw err;
    }
  };

  return {
    isRunning,
    error,
    startGA,
    stopGA,
    exportResults,
  };
}
