import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Upload, 
  Trash2, 
  Edit, 
  Eye,
  User,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  id: string;
  user_name: string;
  action: string;
  details: {
    version?: number;
    file_name?: string;
    [key: string]: any;
  } | null;
  created_at: string;
}

interface CTCAuditLogProps {
  noteId: string;
}

export function CTCAuditLog({ noteId }: CTCAuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLog();
  }, [noteId]);

  const fetchAuditLog = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-ctc', {
        body: { action: 'get-audit-log', noteId },
      });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <Upload className="w-4 h-4 text-green-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-destructive" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'view':
        return <Eye className="w-4 h-4 text-muted-foreground" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionDescription = (entry: AuditEntry) => {
    const details = entry.details;
    switch (entry.action) {
      case 'upload':
        return `Uploaded ${details?.file_name || 'document'} (v${details?.version || 1})`;
      case 'delete':
        return `Deleted ${details?.file_name || 'document'} (v${details?.version || '?'})`;
      case 'update':
        return `Updated document metadata`;
      case 'view':
        return `Viewed document`;
      default:
        return entry.action;
    }
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Audit Trail
          <span className="text-muted-foreground font-normal">({entries.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading audit log...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No activity recorded yet.
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              
              {entries.map((entry, index) => (
                <div key={entry.id} className="relative flex gap-4 pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-border">
                    {getActionIcon(entry.action)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium">
                      {getActionDescription(entry)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{entry.user_name}</span>
                      <span>•</span>
                      <span>{formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
