import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatHistoryProps {
  onNewChat: () => void;
  compact?: boolean;
}

export function ChatHistory({ onNewChat, compact = false }: ChatHistoryProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentSessionId = location.pathname.startsWith('/chat/') ? location.pathname.split('/chat/')[1] : null;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/chat/${sessionId}`);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSessionId === sessionId) {
        onNewChat();
      }
      
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  if (compact) {
    return (
      <div className="space-y-1">
        <Button 
          onClick={onNewChat}
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          size="sm"
        >
          <Plus className="w-3 h-3 mr-2" />
          New Chat
        </Button>
        
        {loading ? (
          <div className="text-center text-muted-foreground py-4 text-xs">
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-xs">
            No chats yet
          </div>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className={`group flex items-center p-2 rounded text-xs cursor-pointer ${
                  currentSessionId === session.id ? 'bg-accent' : 'hover:bg-accent'
                }`}
                onClick={() => handleSelectSession(session.id)}
              >
                <MessageSquare className="w-3 h-3 mr-2 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{session.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="w-2 h-2 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-64 bg-muted/30 border-r border-border h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={onNewChat}
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center p-2 rounded hover:bg-accent cursor-pointer ${
                  currentSessionId === session.id ? 'bg-accent' : ''
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                <div 
                  className="flex-1 min-w-0"
                  onClick={() => handleSelectSession(session.id)}
                >
                  <p className="text-sm truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}