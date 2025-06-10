import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Candidate } from '@shared/schema';

interface SessionContextType {
    foundationEquation: Candidate | null;
    foundationEquationRunId: string | null;
    setFoundationEquation: (equation: Candidate | null) => void;
    setFoundationEquationRunId: (runId: string | null) => void;
    pinnedEquation: Candidate | null;
    setPinnedEquation: (equation: Candidate | null) => void;
    saveEquationToSession: (equation: Candidate) => Promise<void>;
    currentSessionId: string | null;
    setCurrentSessionId: (sessionId: string | null) => void;
    ensureActiveSession: () => Promise<string>;
    loadFoundationEquation: (sessionId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [foundationEquation, setFoundationEquation] = useState<Candidate | null>(null);
    const [foundationEquationRunId, setFoundationEquationRunId] = useState<string | null>(null);
    const [pinnedEquation, setPinnedEquation] = useState<Candidate | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Initialize session on mount
    useEffect(() => {
        initializeSession();
    }, []);

    // Reload foundation equation when session changes
    useEffect(() => {
        if (currentSessionId) {
            loadFoundationEquation(currentSessionId);
        }
    }, [currentSessionId]);

    const loadFoundationEquation = async (sessionId: string) => {
        try {
            // First try to load pinned equations
            const pinnedResponse = await fetch(`/api/sessions/${sessionId}/pinned`);
            if (pinnedResponse.ok) {
                const pinnedEquations = await pinnedResponse.json();
                if (pinnedEquations.length > 0) {
                    const latestPinned = pinnedEquations[0];
                    setFoundationEquation({
                        coefficients: latestPinned.coeffs,
                        generation: latestPinned.generation,
                        fitness: latestPinned.fitness,
                        c_model: latestPinned.cModel,
                        alpha_model: latestPinned.alphaModel,
                        g_model: latestPinned.gModel,
                        delta_c: latestPinned.deltaC,
                        delta_alpha: latestPinned.deltaAlpha,
                        delta_g: latestPinned.deltaG
                    });
                    setFoundationEquationRunId(latestPinned.id);
                    console.log('Loaded pinned equation as foundation equation with run ID:', latestPinned.id);
                    return;
                }
            }

            // If no pinned equations, load the latest saved equation
            const resultsResponse = await fetch(`/api/sessions/${sessionId}/lagrangian-results`);
            if (resultsResponse.ok) {
                const results = await resultsResponse.json();
                if (results.length > 0) {
                    const latestResult = results[0];
                    const coeffs = typeof latestResult.coefficients === 'string' 
                        ? JSON.parse(latestResult.coefficients) 
                        : latestResult.coefficients;
                    
                    setFoundationEquation({
                        coefficients: coeffs,
                        generation: latestResult.generation || 0,
                        fitness: parseFloat(latestResult.fitness) || 0,
                        c_model: parseFloat(latestResult.cModel) || 299792458,
                        alpha_model: parseFloat(latestResult.alphaModel) || 0.007297353,
                        g_model: parseFloat(latestResult.gModel) || 6.674e-11,
                        delta_c: parseFloat(latestResult.deltaC) || 0,
                        delta_alpha: parseFloat(latestResult.deltaAlpha) || 0,
                        delta_g: parseFloat(latestResult.deltaG) || 0
                    });
                    setFoundationEquationRunId(latestResult.id);
                    console.log('Loaded latest equation as foundation equation with run ID:', latestResult.id);
                }
            }
        } catch (error) {
            console.error('Error loading foundation equation:', error);
        }
    };

    const initializeSession = async () => {
        try {
            // Check for active session first
            const response = await fetch('/api/sessions/active', { cache: 'no-store' });
            if (response.ok) {
                const session = await response.json();
                setCurrentSessionId(session.id);
                
                // Load saved equations for this session
                await loadFoundationEquation(session.id);
                return;
            }
            if (response.status === 304) {
                // cached not modified – assume currentSessionId already set earlier
                return;
            }
        } catch (error) {
            console.log('No active session found, will create one when needed');
        }
    };

    const ensureActiveSession = async (): Promise<string> => {
        if (currentSessionId) {
            return currentSessionId;
        }

        // Try fetch active again (no-cache) to avoid unnecessary creation
        try {
            const resp = await fetch('/api/sessions/active', { cache: 'no-store' });
            if (resp.ok) {
                const s = await resp.json();
                setCurrentSessionId(s.id);
                return s.id;
            }
        } catch (e) {
            /* ignore */
        }

        // Create a new session
        const sessionResponse = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `GA Session ${new Date().toLocaleString()}`,
                description: 'Genetic Algorithm Search Results',
                isActive: true
            })
        });
        
        if (!sessionResponse.ok) {
            throw new Error('Failed to create session');
        }

        const newSession = await sessionResponse.json();
        setCurrentSessionId(newSession.id);
        
        // Also activate the session
        await fetch(`/api/sessions/${newSession.id}/activate`, {
            method: 'POST'
        });

        return newSession.id;
    };

    const saveEquationToSession = async (equation: Candidate) => {
        try {
            // Use the ensureActiveSession function
            const sessionId = await ensureActiveSession();

            // Save the equation to the session
            const response = await fetch(`/api/sessions/${sessionId}/lagrangian-results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    coefficients: JSON.stringify(equation.coefficients),
                    generation: equation.generation || 0,
                    fitness: equation.fitness.toString(),
                    cModel: equation.c_model?.toString() || '0',
                    alphaModel: equation.alpha_model?.toString() || '0',
                    gModel: equation.g_model?.toString() || '0',
                    deltaC: equation.delta_c?.toString() || '0',
                    deltaAlpha: equation.delta_alpha?.toString() || '0',
                    deltaG: equation.delta_g?.toString() || '0',
                    isManual: (equation as any).isManual || false
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save equation to session');
            }

            const savedRun = await response.json();
            console.log('Equation saved to session successfully with run ID:', savedRun.id);
            
            // Update the foundation equation run ID
            if (savedRun.id) {
                setFoundationEquationRunId(savedRun.id);
            }
            
            // Refresh the foundation equation to ensure consistency
            await loadFoundationEquation(sessionId);
        } catch (error) {
            console.error('Error saving equation to session:', error);
            throw error;
        }
    };

    return (
        <SessionContext.Provider value={{
            foundationEquation,
            foundationEquationRunId,
            setFoundationEquation,
            setFoundationEquationRunId,
            pinnedEquation,
            setPinnedEquation,
            saveEquationToSession,
            currentSessionId,
            setCurrentSessionId,
            ensureActiveSession,
            loadFoundationEquation
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}