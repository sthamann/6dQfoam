import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Calendar, User, Database } from "lucide-react";

interface Session {
  id: number;
  sessionId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface SessionModalProps {
  isOpen: boolean;
  onSessionSelected: (sessionId: string) => void;
}

export default function SessionModal({ isOpen, onSessionSelected }: SessionModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSession, setNewSession] = useState({
    name: "",
    description: ""
  });

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!newSession.name.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          name: newSession.name.trim(),
          description: newSession.description.trim() || undefined
        })
      });

      if (response.ok) {
        const session = await response.json();
        setSessions(prev => [session, ...prev]);
        setNewSession({ name: "", description: "" });
        onSessionSelected(session.sessionId);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  const selectSession = async (sessionId: string) => {
    try {
      await fetch(`/api/sessions/${sessionId}/activate`, { method: 'POST' });
      onSessionSelected(sessionId);
    } catch (error) {
      console.error('Failed to activate session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-carbon-800 border-carbon-600">
        <DialogHeader>
          <DialogTitle className="text-carbon-10 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Session Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Session */}
          <Card className="bg-carbon-700 border-carbon-600">
            <CardHeader>
              <CardTitle className="text-carbon-20 flex items-center text-lg">
                <Plus className="w-4 h-4 mr-2" />
                Create New Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-carbon-30">Session Name *</Label>
                  <Input
                    value={newSession.name}
                    onChange={(e) => setNewSession(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Dark Matter Investigation 2025"
                    className="bg-carbon-800 border-carbon-600 text-carbon-10"
                  />
                </div>
                <div>
                  <Label className="text-carbon-30">Description</Label>
                  <Input
                    value={newSession.description}
                    onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    className="bg-carbon-800 border-carbon-600 text-carbon-10"
                  />
                </div>
              </div>
              <Button 
                onClick={createSession}
                disabled={!newSession.name.trim() || creating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {creating ? "Creating..." : "Create & Start Session"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Sessions */}
          <div>
            <h3 className="text-lg font-semibold text-carbon-20 mb-4">
              Recent Sessions ({sessions.length})
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-carbon-40">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-carbon-40">
                No sessions found. Create your first session above.
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <Card 
                    key={session.id}
                    className={`cursor-pointer transition-all hover:bg-carbon-600 ${
                      session.isActive 
                        ? 'bg-carbon-600 border-blue-500' 
                        : 'bg-carbon-700 border-carbon-600'
                    }`}
                    onClick={() => selectSession(session.sessionId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-carbon-10">{session.name}</h4>
                            {session.isActive && (
                              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          
                          {session.description && (
                            <p className="text-sm text-carbon-40 mb-2">{session.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-carbon-50">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Created: {formatDate(session.createdAt)}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Updated: {formatDate(session.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-carbon-600" />
          
          <div className="text-sm text-carbon-40">
            <p><strong>Session Management:</strong></p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>All calculation results are automatically saved to the active session</li>
              <li>Switch sessions to work on different research projects</li>
              <li>20-digit precision storage for all numerical values</li>
              <li>Complete traceability from GA search → Relativity → Theory analysis</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}