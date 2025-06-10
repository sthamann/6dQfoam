import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, Clock, ChevronDown, ChevronUp, Edit3, Pin, Save, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { generateFieldEquationString } from '@shared/physics/fieldEquation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FoundationEquationProps {
  className?: string;
}

interface ActiveSession {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
}

export function FoundationEquation({ className = "" }: FoundationEquationProps) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const [isEditing, setIsEditing] = useState(false);
  const [manualEquation, setManualEquation] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { foundationEquation, setFoundationEquation, currentSessionId, ensureActiveSession, saveEquationToSession } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: session, refetch: refetchSession } = useQuery<ActiveSession>({
    queryKey: ['/api/sessions/active'],
    retry: false,
  });

  const { data: pinnedEquations, refetch: refetchPinnedEquations } = useQuery<any[]>({
    queryKey: ['/api/sessions', currentSessionId, 'pinned'],
    enabled: !!currentSessionId,
    retry: false,
  });

  // Auto-create session if none exists
  React.useEffect(() => {
    if (!session && !currentSessionId) {
      ensureActiveSession().then(() => {
        refetchSession();
      });
    }
  }, [session, currentSessionId, ensureActiveSession, refetchSession]);

  // Use foundation equation from context if available, otherwise use latest pinned
  const displayEquation = foundationEquation || pinnedEquations?.[0];

  const formatFieldEquation = (equation: any) => {
    if (!equation || !equation.coefficients) return 'No equation available';
    
    // Use the full field equation generator for proper display
    return generateFieldEquationString(equation.coefficients, {
      normalized: true,
      showPhysicalSigns: true,
      precision: 6,
      format: "unicode",
    });
  };

  const formatPhysicsConstants = (equation: any) => {
    if (!equation) return null;
    
    return {
      c: equation.c_model || equation.cModel,
      alpha: equation.alpha_model || equation.alphaModel,
      g: equation.g_model || equation.gModel,
      deltaC: equation.delta_c || equation.deltaC,
      deltaAlpha: equation.delta_alpha || equation.deltaAlpha,
      deltaG: equation.delta_g || equation.deltaG,
      generation: equation.generation,
      fitness: equation.fitness
    };
  };

  const parseManualEquation = (input: string): number[] => {
    // Try JSON array format first
    if (input.trim().startsWith("[")) {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed) || parsed.length !== 6) {
        throw new Error("JSON array must have exactly 6 coefficients");
      }
      return parsed;
    }

    // Parse the specific format: "ℒ = -0.50000000 (∂ₜφ)² + 0.49999992 (∂ₓφ)² -0.060645922 φ² -0.046854528 (∂ₜφ)²φ² -0.10047012 F²ₘᵥ + 3.2655973e+8 κR"
    // Also support: "L = -0.576185363464(∂_tφ)² -0.576185363746(∂_xφ)² -0.988474574743φ² +0.013036021634(∂_tφ)²φ² -0.091701236848F²"
    
    // Normalize the input to handle various formats
    let normalized = input
      .replace(/ℒ/g, 'L')
      .replace(/∂ₜ/g, '∂_t')
      .replace(/∂ₓ/g, '∂_x')
      .replace(/F²ₘᵥ/g, 'F²')
      .replace(/F_\{μν\}/g, 'F')
      .replace(/κR/g, 'R')
      .replace(/\s+/g, ' '); // Normalize whitespace

    // Pattern to match coefficients for each term
    const patterns = [
      /([-+]?\s*[\d.e+-]+)\s*\(?∂_t\s*φ\)?²/, // (∂ₜφ)²
      /([-+]?\s*[\d.e+-]+)\s*\(?∂_x\s*φ\)?²/, // (∂ₓφ)²
      /([-+]?\s*[\d.e+-]+)\s*φ²(?!\s*\))/,    // φ² (not followed by ))
      /([-+]?\s*[\d.e+-]+)\s*\(?∂_t\s*φ\)?²\s*φ²/, // (∂ₜφ)²φ²
      /([-+]?\s*[\d.e+-]+)\s*F²/,             // F²ₘᵥ
      /([-+]?\s*[\d.e+-]+)\s*[κ]?R/           // κR
    ];

    const coefficients: number[] = [];
    
    for (let i = 0; i < patterns.length; i++) {
      const match = normalized.match(patterns[i]);
      if (match) {
        // Clean the coefficient string and parse
        const coeff = match[1].replace(/\s+/g, '');
        coefficients.push(parseFloat(coeff));
      } else if (i < 5) {
        // First 5 coefficients are required
        throw new Error(`Could not parse coefficient for term ${i + 1}`);
      } else {
        // 6th coefficient (κR) is optional, default to 0
        coefficients.push(0);
      }
    }

    if (coefficients.length < 5) {
      throw new Error("Could not parse all required coefficients. Expected format: ℒ = c1 (∂ₜφ)² + c2 (∂ₓφ)² + c3 φ² + c4 (∂ₜφ)²φ² + c5 F²ₘᵥ [+ c6 κR]");
    }

    return coefficients.slice(0, 6); // Ensure we have exactly 6 coefficients
  };

  const handleSaveManualEquation = async () => {
    try {
      setIsSaving(true);
      setParseError(null);
      const coeffs = parseManualEquation(manualEquation);
      
      // Create a foundation equation object
      const newEquation = {
        coefficients: coeffs,
        generation: 0,
        fitness: 0,
        c_model: 299792458,
        alpha_model: 0.007297353,
        g_model: 6.674e-11,
        delta_c: 0,
        delta_alpha: 0,
        delta_g: 0,
        timestamp: Date.now(),
        pinnedAt: new Date().toISOString(),
        isManual: true,
      };
      
      // Save to context state
      setFoundationEquation(newEquation);
      
      // Save to database
      await saveEquationToSession(newEquation);
      
      // Auto-pin manual equations
      if (currentSessionId) {
        try {
          // Get the just-saved equation ID by fetching the latest result
          const resultsResponse = await fetch(`/api/sessions/${currentSessionId}/lagrangian-results`);
          if (resultsResponse.ok) {
            const results = await resultsResponse.json();
            if (results.length > 0) {
              const latestResult = results[0]; // results are returned newest-first
              
              // Pin the equation
              const pinResponse = await fetch(
                `/api/sessions/${currentSessionId}/pin/${latestResult.id}`,
                {
                  method: "POST",
                }
              );
              
              if (pinResponse.ok) {
                console.log("Manual equation automatically pinned");
                // Notify other UI parts (DataManagement) to reload session details
                window.dispatchEvent(new CustomEvent('session-data-updated', { detail: { sessionId: currentSessionId } }));
                // Refresh the pinned equations query
                await refetchPinnedEquations();
                // Invalidate related queries
                queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId, 'lagrangian-results'] });
              }
            }
          }
        } catch (pinError) {
          console.error("Failed to auto-pin equation:", pinError);
        }
      }
      
      toast({
        title: "Equation saved successfully",
        description: "Your manual equation has been saved to the database and pinned to the session.",
      });
      
      setIsEditing(false);
      setManualEquation("");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid equation format");
      toast({
        title: "Failed to save equation",
        description: error instanceof Error ? error.message : "Invalid equation format",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setManualEquation("");
    setParseError(null);
  };

  const handleEditClick = () => {
    if (!isEditing && displayEquation?.coefficients) {
      // Pre-fill with current equation in the requested format
      const coeffs = displayEquation.coefficients;
      const formatted = `ℒ = ${coeffs[0]?.toFixed(8) || '0'} (∂ₜφ)² ${coeffs[1] >= 0 ? '+' : ''} ${coeffs[1]?.toFixed(8) || '0'} (∂ₓφ)² ${coeffs[2] >= 0 ? '+' : ''} ${coeffs[2]?.toFixed(8) || '0'} φ² ${coeffs[3] >= 0 ? '+' : ''} ${coeffs[3]?.toFixed(8) || '0'} (∂ₜφ)²φ² ${coeffs[4] >= 0 ? '+' : ''} ${coeffs[4]?.toFixed(8) || '0'} F²ₘᵥ${coeffs[5] ? ` ${coeffs[5] >= 0 ? '+' : ''} ${coeffs[5].toExponential(3)} κR` : ''}`;
      setManualEquation(formatted);
    } else if (!isEditing) {
      // No equation to pre-fill, just open edit mode with empty field
      setManualEquation("");
    }
    setIsEditing(!isEditing);
  };

  if (!session) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center h-[54px] bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-800 rounded-lg px-4">
          <Calculator className="h-4 w-4 text-amber-800 dark:text-amber-200 mr-2" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200 flex-1">
            Foundation Equation
          </span>
          <Badge variant="outline" className="text-xs mr-2">
            No Session
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        <div className={`mt-2 transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No active session. Create or activate a session to display the foundation equation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center h-[54px] bg-blue-50 dark:bg-blue-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg px-4">
        <Calculator className="h-4 w-4 text-blue-800 dark:text-blue-200 mr-2" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200 flex-1">
          Foundation Equation
        </span>
        <Badge variant="outline" className="text-xs mr-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700">
          {session.name}
        </Badge>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 mr-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
          onClick={handleEditClick}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>
      <div className={`mt-2 transition-all duration-300 overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="p-4 space-y-3">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="equation-input" className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                    Enter equation manually
                  </Label>
                  <Textarea
                    id="equation-input"
                    value={manualEquation}
                    onChange={(e) => setManualEquation(e.target.value)}
                    placeholder="ℒ = -0.50000000 (∂ₜφ)² + 0.49999992 (∂ₓφ)² -0.060645922 φ² -0.046854528 (∂ₜφ)²φ² -0.10047012 F²ₘᵥ + 3.2655973e+8 κR"
                    className="font-mono text-xs"
                    rows={3}
                  />
                  {parseError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{parseError}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Supported formats:
                  <br />• ℒ = c₁ (∂ₜφ)² + c₂ (∂ₓφ)² + c₃ φ² + c₄ (∂ₜφ)²φ² + c₅ F²ₘᵥ [+ c₆ κR]
                  <br />• JSON array: [c₁, c₂, c₃, c₄, c₅, c₆]
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveManualEquation}
                    className="text-xs"
                    disabled={isSaving}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : displayEquation ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Pin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Pinned Foundation Equation
                    </span>
                  </div>
                  <div className="font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 rounded border">
                    {formatFieldEquation(displayEquation)}
                  </div>
                </div>
                
                {(() => {
                  const constants = formatPhysicsConstants(displayEquation);
                  return constants && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <strong>Speed of Light:</strong>
                        <br />c = {constants.c?.toPrecision(12) || 'N/A'} m/s
                        {constants.deltaC && (
                          <div>
                            <br />
                            <span className="text-gray-500">
                              Δc = {(constants.deltaC * 100).toExponential(3)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <strong>Fine Structure:</strong>
                        <br />α = {constants.alpha?.toPrecision(12) || 'N/A'}
                        {constants.deltaAlpha && (
                          <div>
                            <br />
                            <span className="text-gray-500">
                              Δα = {(constants.deltaAlpha * 100).toExponential(3)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <strong>Newton G:</strong>
                        <br />G = {constants.g?.toPrecision(12) || 'N/A'}
                        {constants.deltaG && (
                          <div>
                            <br />
                            <span className="text-gray-500">
                              ΔG = {(constants.deltaG * 100).toExponential(3)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>Generation {displayEquation.generation || 'N/A'}</span>
                  </div>
                  
                  {displayEquation.fitness && (
                    <div>
                      Fitness: {displayEquation.fitness.toExponential(3)}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock className="h-3 w-3" />
                    <span>{(displayEquation as any).pinnedAt ? new Date((displayEquation as any).pinnedAt).toLocaleTimeString() : 'Active'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No equation pinned. Click the edit button to enter an equation manually or pin an equation from the genetic algorithm results.
              </div>
            )}
            
            {session.description && (
              <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
                {session.description}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FoundationEquation;