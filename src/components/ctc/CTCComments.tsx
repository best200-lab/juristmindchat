import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_name: string;
  content: string;
  page_number: number | null;
  created_at: string;
}

interface CTCCommentsProps {
  ctcFileId: string;
}

export function CTCComments({ ctcFileId }: CTCCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [ctcFileId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-ctc', {
        body: { action: 'list-comments', ctcFileId },
      });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-ctc', {
        body: { 
          action: 'add-comment', 
          ctcFileId, 
          content: newComment.trim(),
        },
      });

      if (error) throw error;
      
      setComments([...comments, data]);
      setNewComment("");
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Comments & Annotations
          <span className="text-muted-foreground font-normal">({comments.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment List */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No comments yet. Be the first to add one.
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(comment.user_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                    {comment.page_number && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Page {comment.page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment */}
        <div className="flex gap-2 pt-2 border-t">
          <Textarea
            placeholder="Add a comment or annotation..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            size="sm"
            className="gap-1.5"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
