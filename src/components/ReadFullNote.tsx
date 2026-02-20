import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Tag, 
  Download, 
  ArrowLeft, 
  Building, 
  User, 
  Hash,
  Share2,
  Bookmark,
  Printer,
  FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CTCSection } from "@/components/ctc";

interface JudgeNote {
  id: string;
  title: string;
  judge_name: string;
  court: string;
  category: string;
  content: string;
  tags: string[];
  created_at: string;
  case_suit_number?: string;
}

interface ReadFullNoteProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReadFullNote({ noteId, open, onOpenChange }: ReadFullNoteProps) {
  const [note, setNote] = useState<JudgeNote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && noteId) {
      fetchNote();
    }
  }, [open, noteId]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-judge-notes', {
        body: { action: 'get-by-id', noteData: { id: noteId } }
      });

      if (error) throw error;
      setNote(data);
    } catch (error) {
      console.error('Error fetching note:', error);
      toast.error('Failed to fetch case report details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadText = () => {
    if (!note) return;
    
    const content = `
══════════════════════════════════════════════════════════════
                    CASE REPORT
══════════════════════════════════════════════════════════════

TITLE: ${note.title}

JUDGE: ${note.judge_name}
COURT: ${note.court}
CATEGORY: ${note.category}
${note.case_suit_number ? `CASE NUMBER: ${note.case_suit_number}` : ''}
DATE: ${new Date(note.created_at).toLocaleDateString('en-NG', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

══════════════════════════════════════════════════════════════
                    CONTENT
══════════════════════════════════════════════════════════════

${note.content}

══════════════════════════════════════════════════════════════

TAGS: ${note.tags.join(', ')}

Generated from JuristMind AI Legal Repository
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case-report-${note.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Case report downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!note) return;
    
    const shareData = {
      title: note.title,
      text: `Case Report: ${note.title} - ${note.judge_name} at ${note.court}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadText} className="gap-1.5">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading case report...</p>
              </div>
            </div>
          ) : note ? (
            <div className="p-6 md:p-8 space-y-8">
              {/* Title & Metadata Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {note.category}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(note.created_at)}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 leading-tight">
                  {note.title}
                </h1>
                
                {/* Metadata Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Judge</span>
                    </div>
                    <p className="font-medium text-foreground">{note.judge_name}</p>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Court</span>
                    </div>
                    <p className="font-medium text-foreground">{note.court}</p>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Date</span>
                    </div>
                    <p className="font-medium text-foreground">
                      {new Date(note.created_at).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  
                  {note.case_suit_number && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Hash className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider">Case No.</span>
                      </div>
                      <p className="font-medium text-foreground">{note.case_suit_number}</p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* CTC Section */}
              <CTCSection noteId={note.id} />

              <Separator />

              {/* Full Content Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Case Report Content</h2>
                </div>
                
                <div className="bg-muted/20 border rounded-xl p-6 md:p-8">
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed text-[15px]">
                      {note.content}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      This case report was sourced from JuristMind AI Legal Repository
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Case report not found</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
