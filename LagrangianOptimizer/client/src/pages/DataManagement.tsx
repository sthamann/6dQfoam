import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Calendar,
  Target,
  Zap,
  Calculator,
  Download,
  Trash2,
  Edit,
  Eye,
  BarChart3,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  RefreshCw,
  Settings,
  Pin,
  FlaskConical,
  Activity,
  X,
} from "lucide-react";
import type { Session, Parameter } from "@shared/schema";

interface LagrangianResult {
  id: string;
  sessionId: string;
  coefficients: string;
  generation: number;
  fitness: string;
  cModel: string;
  alphaModel: string;
  gModel: string;
  deltaC: string;
  deltaAlpha: string;
  deltaG: string;
  isManual: boolean;
  isPinned?: boolean;
  createdAt: string;
}

interface SessionData {
  session: Session;
  lagrangianResults: LagrangianResult[];
  pinnedCount: number;
  totalResults: number;
  relativityResults?: any[];
  testResults?: any[];
  theoryResults?: any[];
  parameters?: Parameter[];
}

// Helper to identify display name for parameter keys
const PARAM_LABELS: Record<string, string> = {
  lorentzEpsilon: "Lorentz ε",
  epsilon: "Lorentz ε",
  newtonConstant: "Newton G₄",
  G4: "Newton G₄",
  planckMassSquared: "Planck M²",
  MP2: "Planck M²",
};

export default function DataManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedEquationId, setSelectedEquationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    name: "",
    description: "",
  });
  const [sessionDetails, setSessionDetails] = useState<{
    [key: string]: SessionData;
  }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  useEffect(() => {
    const handler = (ev: any) => {
      const sid = ev.detail?.sessionId;
      if (sid) {
        loadSessionDetails(sid);
      }
    };
    window.addEventListener('session-data-updated', handler);
    return () => window.removeEventListener('session-data-updated', handler);
  }, [sessions]);

  // Load details when selected session changes
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);

        // Load details for each session
        for (const session of data) {
          if (session.id) {
            await loadSessionDetails(session.id);
          }
        }
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    // Load lagrangian results
    let lagrangianResults: LagrangianResult[] = [];
    try {
      const lagResponse = await fetch(`/api/sessions/${sessionId}/lagrangian-results`);
      
      if (lagResponse.ok) {
        const results = await lagResponse.json();
        // Normalize coefficients to always be strings
        lagrangianResults = results.map((r: any) => ({
          ...r,
          coefficients: Array.isArray(r.coefficients) ? JSON.stringify(r.coefficients) : r.coefficients
        }));
      }
    } catch (e) {
      console.warn('Failed to load lagrangian results:', e);
    }

    // Load pinned results
    let pinnedData: any[] = [];
    try {
      const pinnedResponse = await fetch(`/api/sessions/${sessionId}/pinned`);
      
      if (pinnedResponse.ok) {
        pinnedData = await pinnedResponse.json();
      }
    } catch (e) {
      console.warn('Failed to load pinned results:', e);
    }

    // Create a map of existing results by ID
    const resultsMap = new Map(lagrangianResults.map(r => [r.id, r]));
    
    // Add pinned results that aren't already in lagrangianResults
    pinnedData.forEach(pinned => {
      if (!resultsMap.has(pinned.id)) {
        // Transform pinned run to match LagrangianResult format
        const pinnedResult: LagrangianResult = {
          id: pinned.id,
          sessionId: pinned.sessionId,
          coefficients: JSON.stringify(pinned.coeffs),
          generation: pinned.generation || 0,
          fitness: pinned.fitness?.toString() || "0",
          cModel: pinned.cModel?.toString() || "299792458",
          alphaModel: pinned.alphaModel?.toString() || "0.007297353",
          gModel: pinned.gModel?.toString() || "6.674e-11",
          deltaC: pinned.deltaC?.toString() || "0",
          deltaAlpha: pinned.deltaAlpha?.toString() || "0",
          deltaG: pinned.deltaG?.toString() || "0",
          isManual: pinned.kind === "manual",
          isPinned: true,
          createdAt: pinned.createdAt
        };
        lagrangianResults.push(pinnedResult);
      } else {
        // Mark existing result as pinned
        const existing = resultsMap.get(pinned.id);
        if (existing) {
          existing.isPinned = true;
        }
      }
    });
    
    // Sort by creation date, newest first
    lagrangianResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Load relativity results
    let relativityResults: any[] = [];
    try {
      const relResponse = await fetch(`/api/sessions/${sessionId}/relativity-results`);
      if (relResponse.ok) {
        relativityResults = await relResponse.json();
      }
    } catch (e) {
      console.warn('Failed to load relativity results:', e);
    }

    // Load test results
    let testResults: any[] = [];
    try {
      console.log(`📚 Loading test results for session: ${sessionId}`);
      const testResponse = await fetch(`/api/sessions/${sessionId}/test-results`);
      if (testResponse.ok) {
        const data = await testResponse.json();
        testResults = data.results || [];
        console.log(`✅ Loaded ${testResults.length} test results`);
        if (testResults.length > 0) {
          console.log('Test result sample:', testResults[0]);
        }
      } else {
        console.error(`❌ Failed to load test results: ${testResponse.status}`);
      }
    } catch (e) {
      console.warn('Failed to load test results:', e);
    }

    // Load theory results
    let theoryResults: any[] = [];
    try {
      const theoryResponse = await fetch(`/api/sessions/${sessionId}/theory-results`);
      if (theoryResponse.ok) {
        const data = await theoryResponse.json();
        theoryResults = data.results || [];
      }
    } catch (e) {
      console.warn('Failed to load theory results:', e);
    }

    // Load stored parameters
    let parameters: Parameter[] = [];
    try {
      const paramResponse = await fetch(`/api/sessions/${sessionId}/parameters`);
      if (paramResponse.ok) {
        parameters = await paramResponse.json();
      }
    } catch (e) {
      console.warn('Failed to load parameters:', e);
    }

    const sessionData: SessionData = {
      session,
      lagrangianResults,
      pinnedCount: pinnedData.length,
      totalResults: lagrangianResults.length,
      relativityResults,
      testResults,
      theoryResults,
      parameters,
    };

    // Debug logging
    console.log('Session details loaded:', {
      sessionId,
      pinnedCount: pinnedData.length,
      lagrangianResultsCount: lagrangianResults.length,
      pinnedResults: lagrangianResults.filter(r => r.isPinned).length,
      pinnedData: pinnedData,
      lagrangianResults: lagrangianResults
    });

    setSessionDetails((prev) => ({
      ...prev,
      [sessionId]: sessionData,
    }));
  };

  const createSession = async () => {
    if (!newSessionData.name.trim()) return;

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSessionData.name,
          description: newSessionData.description,
          isActive: false,
        }),
      });

      if (response.ok) {
        setNewSessionData({ name: "", description: "" });
        setShowCreateDialog(false);
        toast({
          title: "Session created",
          description: "New session created successfully",
        });
        loadSessions();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const editSession = async () => {
    if (!editingSession) return;

    try {
      const response = await fetch(`/api/sessions/${editingSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSession.name,
          description: editingSession.description,
        }),
      });

      if (response.ok) {
        setEditingSession(null);
        setShowEditDialog(false);
        toast({
          title: "Session updated",
          description: "Session details updated successfully",
        });
        loadSessions();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (!confirm(`Delete session "${session.name}"?\n\nThis will permanently remove all associated data.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Session deleted",
          description: "Session and all associated data removed",
        });
        
        // If we deleted the selected session, select another one
        if (selectedSessionId === sessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          setSelectedSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        }
        
        loadSessions();
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const setActiveSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Active session changed",
          description: "Session activated successfully",
        });
        loadSessions();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate session",
        variant: "destructive",
      });
    }
  };

  const exportToMarkdown = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/export/markdown/full/${sessionId}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const sessionName = sessions.find(s => s.id === sessionId)?.name || "session";
        a.download = `${sessionName}-analysis-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export completed",
          description: "Session data exported successfully",
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export session data",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setShowCreateDialog(false);
    setNewSessionData({ name: "", description: "" });
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setEditingSession(null);
  };

  const deleteHistoricSessions = async () => {
    if (!confirm("Delete all historic (inactive) sessions? This cannot be undone.")) return;
    const inactive = sessions.filter((s) => !s.isActive);
    for (const s of inactive) {
      await fetch(`/api/sessions/${s.id}`, { method: "DELETE" });
    }
    loadSessions();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Database className="w-16 h-16 text-carbon-400 mx-auto animate-pulse" />
          <div className="text-carbon-20">Loading sessions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : null;
  const selectedSessionData = selectedSessionId ? sessionDetails[selectedSessionId] : null;
  const activeSession = sessions.find(s => s.isActive);

  // Debug what's happening with selected session data
  console.log('DataManagement render:', {
    selectedSessionId,
    selectedSessionData,
    pinnedEquations: selectedSessionData?.lagrangianResults?.filter(eq => eq.isPinned),
    sessionDetails: Object.keys(sessionDetails)
  });

  return (
    <div className="h-full bg-carbon-900 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-carbon-800 border-r border-carbon-600 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-carbon-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-carbon-10">Sessions</h2>
            <div className="flex gap-1">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-carbon-800 border-carbon-600">
                  <DialogHeader>
                    <DialogTitle className="text-carbon-10">Create New Session</DialogTitle>
                    <DialogDescription className="text-carbon-40">
                      Create a new calculation session to organize your physics analysis work.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-carbon-20">Session Name</Label>
                      <Input
                        id="name"
                        value={newSessionData.name}
                        onChange={(e) =>
                          setNewSessionData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="bg-carbon-700 border-carbon-600 text-carbon-10"
                        placeholder="Enter session name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="text-carbon-20">Description (Optional)</Label>
                      <Textarea
                        id="description"
                        value={newSessionData.description}
                        onChange={(e) =>
                          setNewSessionData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="bg-carbon-700 border-carbon-600 text-carbon-10"
                        placeholder="Enter session description"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button
                        onClick={createSession}
                        disabled={!newSessionData.name.trim()}
                      >
                        Create Session
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Purge historic sessions */}
              <Button size="sm" variant="destructive" onClick={deleteHistoricSessions} title="Delete all inactive sessions">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            {activeSession && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-sm font-medium text-green-300">Active</div>
                    <div className="text-xs text-green-200">{activeSession.name}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center">
              <Database className="w-12 h-12 text-carbon-400 mx-auto mb-3" />
              <p className="text-carbon-40 text-sm mb-3">No sessions found</p>
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create First Session
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {sessions.map((session) => {
                const details = sessionDetails[session.id];
                const isSelected = selectedSessionId === session.id;
                
                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-blue-600/20 border border-blue-500/50" 
                        : "hover:bg-carbon-700/50"
                    }`}
                    onClick={() => { 
                      setSelectedSessionId(session.id); 
                      setSelectedEquationId(null);
                      loadSessionDetails(session.id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-carbon-10 truncate">
                            {session.name}
                          </h3>
                          {session.isActive && (
                            <Badge variant="outline" className="bg-green-600/20 border-green-500 text-green-300 text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-xs text-carbon-40 space-y-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(session.createdAt).toLocaleDateString()}
                          </div>
                          
                          {details && (
                            <div className="flex items-center gap-3">
                              {details.totalResults > 0 && (
                                <div className="flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  {details.totalResults}
                                </div>
                              )}
                              {details.pinnedCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Pin className="w-3 h-3" />
                                  {details.pinnedCount}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedSession ? (
          <>
            {/* Session Header */}
            <div className="p-6 border-b border-carbon-600">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-carbon-10 mb-2">
                    {selectedSession.name}
                  </h1>
                  {selectedSession.description && (
                    <p className="text-carbon-40 mb-3">{selectedSession.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-carbon-40">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {new Date(selectedSession.createdAt).toLocaleDateString()}
                    </div>
                    {selectedSessionData && (
                      <>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {selectedSessionData.totalResults} equations
                        </div>
                        {selectedSessionData.pinnedCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Pin className="w-4 h-4" />
                            {selectedSessionData.pinnedCount} pinned
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!selectedSession.isActive && (
                    <Button
                      variant="outline"
                      onClick={() => setActiveSession(selectedSession.id)}
                      className="border-carbon-600"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => exportToMarkdown(selectedSession.id)}
                    className="border-carbon-600"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingSession(selectedSession);
                      setShowEditDialog(true);
                    }}
                    className="border-carbon-600"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => deleteSession(selectedSession.id)}
                    disabled={selectedSession.isActive}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            {/* Session Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="pinned" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pinned">Pinned Equations</TabsTrigger>
                  <TabsTrigger value="equations">All Equations</TabsTrigger>
                  <TabsTrigger value="relativity">Relativity Results</TabsTrigger>
                  <TabsTrigger value="theory">Theory Tests</TabsTrigger>
                </TabsList>

                <TabsContent value="pinned" className="space-y-4">
                  {selectedSessionData?.lagrangianResults.filter(eq => eq.isPinned).length === 0 ? (
                    <Card className="bg-carbon-800 border-carbon-600">
                      <CardContent className="p-8 text-center">
                        <Pin className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-carbon-20 mb-2">
                          No Pinned Equations
                        </h3>
                        <p className="text-carbon-40">
                          Pin important equations from the analysis tabs to save them here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {selectedSessionData?.lagrangianResults
                        .filter(eq => eq.isPinned)
                        .map((equation, index) => (
                          <Card 
                            key={equation.id}
                            className={`bg-carbon-800 border ${selectedEquationId===String(equation.id)?'border-blue-500':'border-carbon-600'} cursor-pointer`}
                            onClick={() => setSelectedEquationId(String(equation.id))}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Pin className="w-4 h-4 text-blue-400" />
                                  <h4 className="font-medium text-carbon-10">
                                    Equation #{index + 1}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    Gen {equation.generation}
                                  </Badge>
                                </div>
                                <div className="text-xs text-carbon-40">
                                  {new Date(equation.createdAt).toLocaleString()}
                                </div>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-carbon-40">Coefficients:</span>
                                  <code className="ml-2 text-carbon-20 bg-carbon-900 px-2 py-1 rounded">
                                    {equation.coefficients}
                                  </code>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-carbon-40">Fitness:</span>
                                    <span className="ml-2 text-carbon-20">{equation.fitness}</span>
                                  </div>
                                  <div>
                                    <span className="text-carbon-40">c:</span>
                                    <span className="ml-2 text-carbon-20">{equation.cModel}</span>
                                  </div>
                                  <div>
                                    <span className="text-carbon-40">α:</span>
                                    <span className="ml-2 text-carbon-20">{equation.alphaModel}</span>
                                  </div>
                                  <div>
                                    <span className="text-carbon-40">G:</span>
                                    <span className="ml-2 text-carbon-20">{equation.gModel}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="equations" className="space-y-4">
                  {selectedSessionData?.lagrangianResults.length === 0 ? (
                    <Card className="bg-carbon-800 border-carbon-600">
                      <CardContent className="p-8 text-center">
                        <Calculator className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-carbon-20 mb-2">
                          No Equations Found
                        </h3>
                        <p className="text-carbon-40">
                          Run genetic algorithm searches to generate field equations.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {selectedSessionData?.lagrangianResults.map((equation, index) => (
                        <Card 
                          key={equation.id}
                          className={`bg-carbon-800 border ${selectedEquationId===String(equation.id)?'border-blue-500':'border-carbon-600'} cursor-pointer`}
                          onClick={() => setSelectedEquationId(String(equation.id))}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {equation.isPinned && <Pin className="w-4 h-4 text-blue-400" />}
                                <div>
                                  <div className="text-sm font-medium text-carbon-10">
                                    Generation {equation.generation}
                                  </div>
                                  <div className="text-xs text-carbon-40">
                                    Fitness: {equation.fitness}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-carbon-40">
                                {new Date(equation.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="relativity" className="space-y-4">
                  {!selectedSessionData?.relativityResults || selectedSessionData.relativityResults.length === 0 ? (
                    <Card className="bg-carbon-800 border-carbon-600">
                      <CardContent className="p-8 text-center">
                        <FlaskConical className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-carbon-20 mb-2">
                          No Relativity Results
                        </h3>
                        <p className="text-carbon-40">
                          Run relativity analyses in Tab 2 to see results here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {selectedSessionData.relativityResults.map((result, index) => (
                        <Card key={result.id} className="bg-carbon-800 border-carbon-600">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-4 h-4 text-green-400" />
                                <h4 className="font-medium text-carbon-10">
                                  Test Result #{index + 1}
                                </h4>
                                <div className="text-xs text-carbon-40">
                                  {new Date(result.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-carbon-40">Lorentz ε:</span>
                                <span className="ml-2 text-carbon-20 font-mono">
                                  {parseFloat(result.lorentzEpsilon).toExponential(3)}
                                </span>
                              </div>
                              <div>
                                <span className="text-carbon-40">Newton G₄:</span>
                                <span className="ml-2 text-carbon-20 font-mono">
                                  {parseFloat(result.newtonConstant).toFixed(6)}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-carbon-40">Coefficients:</span>
                                <code className="ml-2 text-carbon-20 bg-carbon-900 px-2 py-1 rounded text-xs">
                                  {result.coefficients}
                                </code>
                              </div>
                              {result.psi0Profile && (
                                <div className="col-span-2">
                                  <span className="text-carbon-40">ψ₀ profile:</span>
                                  <span className="ml-2 text-carbon-20">
                                    {JSON.parse(result.psi0Profile).length} data points
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="theory" className="space-y-4">
                  {!selectedSessionData?.testResults || selectedSessionData.testResults.length === 0 ? (
                    <Card className="bg-carbon-800 border-carbon-600">
                      <CardContent className="p-8 text-center">
                        <Activity className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-carbon-20 mb-2">
                          No Theory Test Results
                        </h3>
                        <p className="text-carbon-40">
                          Run theory validation tests in Tab 3 to see results here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Display important parameters */}
                      {selectedSessionData?.parameters && selectedSessionData.parameters.length>0 && (
                        <Card className="bg-carbon-800 border-carbon-600 lg:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-sm text-carbon-10">Key Physical Parameters</CardTitle>
                          </CardHeader>
                          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            {selectedSessionData.parameters.slice(0,10).map((p)=> (
                              <div key={p.id} className="flex justify-between">
                                <span className="text-carbon-40">{PARAM_LABELS[p.name]||p.name}:</span>
                                <span className="text-carbon-20 font-mono">{p.value.toExponential(3)}</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                      {/* Group tests by name for better display */}
                      {Object.entries(
                        (selectedSessionData.testResults || []).filter(t=> !selectedEquationId || t.runId===selectedEquationId).reduce((acc: Record<string, any[]>, test: any) => {
                          if (!acc[test.name]) acc[test.name] = [];
                          acc[test.name].push(test);
                          return acc;
                        }, {} as Record<string, any[]>)
                      ).map(([testName, tests]) => (
                        <Card key={testName} className="bg-carbon-800 border-carbon-600">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-carbon-10 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {tests[0].success ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span>{testName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {tests.length} {tests.length === 1 ? 'run' : 'runs'}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {tests.slice(-1).map((test, idx) => {
                              const result = typeof test.result === 'string' ? JSON.parse(test.result) : test.result;
                              return (
                                <div key={idx} className="text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-carbon-40">Runtime:</span>
                                    <span className="text-carbon-20">{test.runtimeMs}ms</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-carbon-40">Status:</span>
                                    <span className={test.success ? "text-green-400" : "text-red-400"}>
                                      {test.success ? 'PASSED' : 'FAILED'}
                                    </span>
                                  </div>
                                  {result.epsilon !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-carbon-40">Lorentz ε:</span>
                                      <span className="text-carbon-20 font-mono">
                                        {result.epsilon.toExponential(3)}
                                      </span>
                                    </div>
                                  )}
                                  {result.GNewton !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-carbon-40">Newton G:</span>
                                      <span className="text-carbon-20 font-mono">
                                        {result.GNewton.toFixed(6)}
                                      </span>
                                    </div>
                                  )}
                                  {result.MP2 !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-carbon-40">Planck M²:</span>
                                      <span className="text-carbon-20 font-mono">
                                        {result.MP2.toExponential(3)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-carbon-50 mt-2">
                                    {new Date(test.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Download Report Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-3 bg-blue-600/20 hover:bg-blue-600/30 border-blue-500"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/export/markdown/${testName}/${selectedSession.id}`);
                                  if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `${testName}-report-${selectedSession.id}.md`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  }
                                } catch (error) {
                                  console.error('Error downloading report:', error);
                                }
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Download Report
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database className="w-24 h-24 text-carbon-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-carbon-20 mb-2">
                Data Management
              </h2>
              <p className="text-carbon-40 mb-6">
                Select a session from the sidebar to view its data and analysis results.
              </p>
              {sessions.length === 0 && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Session
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-carbon-800 border-carbon-600">
          <DialogHeader>
            <DialogTitle className="text-carbon-10">Edit Session</DialogTitle>
            <DialogDescription className="text-carbon-40">
              Update the session name and description.
            </DialogDescription>
          </DialogHeader>
          {editingSession && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name" className="text-carbon-20">Session Name</Label>
                <Input
                  id="edit-name"
                  value={editingSession.name}
                  onChange={(e) =>
                    setEditingSession((prev) =>
                      prev ? { ...prev, name: e.target.value } : null
                    )
                  }
                  className="bg-carbon-700 border-carbon-600 text-carbon-10"
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-carbon-20">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingSession.description || ""}
                  onChange={(e) =>
                    setEditingSession((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  className="bg-carbon-700 border-carbon-600 text-carbon-10"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleEditDialogClose}>
                  Cancel
                </Button>
                <Button onClick={editSession}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}