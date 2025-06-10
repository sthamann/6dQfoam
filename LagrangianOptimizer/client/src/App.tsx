import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "./contexts/SessionContext";
import LagrangianSearch from "@/pages/LagrangianSearch";
import PhysicsLagrangianSearch from "@/pages/PhysicsLagrangianSearch";
import RelativityPage from "@/pages/RelativityPage";
import UnifiedTheory from "@/pages/UnifiedTheory";
import DataManagement from "@/pages/DataManagement";
import Universe from "@/pages/Universe";
import TheoryOverview from "@/pages/TheoryOverview";
import SessionModal from "@/components/SessionModal";
import { FoundationEquation } from "@/components/FoundationEquation";
import HealthLamp from "@/components/HealthLamp";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <>
      {/* Header Section */}
      <header className="bg-carbon-900 border-b border-carbon-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
            Quantum Foam 6D Theory - Exploration Lab
          </h1>
          <div className="text-sm text-carbon-40">
            © Stefan Hamann, 2025
          </div>
        </div>
      </header>
      
      <nav className="bg-carbon-800 border-b-2 border-cyan-400/30 px-6 py-4 shadow-lg">
        <div className="flex items-start gap-6">
          <div className="flex space-x-2 flex-1">
            <Link href="/theory-overview" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/theory-overview" 
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-indigo-500/50 hover:shadow-md"
            }`}>
              Tab 0: The Theory
            </Link>
            <Link href="/" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/" 
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-cyan-500/50 hover:shadow-md"
            }`}>
              Tab 1: Lagrangian Search
            </Link>
            <Link href="/physics-lagrangian" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/physics-lagrangian" 
                ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-400 shadow-lg shadow-purple-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-purple-500/50 hover:shadow-md"
            }`}>
              Tab 1b: Physics-Based GA
            </Link>
            <Link href="/relativity" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/relativity" 
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 shadow-lg shadow-purple-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-purple-500/50 hover:shadow-md"
            }`}>
              Tab 2: Relativity Analysis
            </Link>
            <Link href="/theory" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/theory" 
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-400 shadow-lg shadow-green-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-green-500/50 hover:shadow-md"
            }`}>
              Tab 3: Unified Theory
            </Link>
            <Link href="/data" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/data" 
                ? "bg-gradient-to-r from-orange-600 to-red-600 text-white border-orange-400 shadow-lg shadow-orange-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-orange-500/50 hover:shadow-md"
            }`}>
              Tab 4: Data Management
            </Link>
            <Link href="/universe" className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border-2 ${
              location === "/universe" 
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-400 shadow-lg shadow-violet-500/20" 
                : "text-carbon-20 border-carbon-600 hover:text-white hover:bg-carbon-700 hover:border-violet-500/50 hover:shadow-md"
            }`}>
              Tab 5: 6-D Universe Explorer
            </Link>
          </div>
          
          <div className="w-80 flex items-center gap-3">
            <HealthLamp />
            <FoundationEquation />
          </div>
        </div>
      </nav>
    </>
  );
}

function Router() {
  return (
    <div className="h-screen bg-carbon-900 text-carbon-10">
      <Navigation />
      <div className="h-[calc(100vh-120px)]">
        <Switch>
          <Route path="/theory-overview" component={TheoryOverview} />
          <Route path="/" component={LagrangianSearch} />
          <Route path="/physics-lagrangian" component={PhysicsLagrangianSearch} />
          <Route path="/relativity" component={RelativityPage} />
          <Route path="/theory" component={UnifiedTheory} />
          <Route path="/data" component={DataManagement} />
          <Route path="/universe" component={Universe} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);

  useEffect(() => {
    // Check for active session on app load
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const response = await fetch('/api/sessions/active');
      if (response.ok) {
        const session = await response.json();
        setCurrentSession(session.sessionId);
      } else {
        // No active session, show modal
        setShowSessionModal(true);
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
      setShowSessionModal(true);
    }
  };

  const handleSessionSelected = (sessionId: string) => {
    setCurrentSession(sessionId);
    setShowSessionModal(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
          {showSessionModal && (
            <SessionModal 
              isOpen={showSessionModal} 
              onSessionSelected={handleSessionSelected}
            />
          )}
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;
