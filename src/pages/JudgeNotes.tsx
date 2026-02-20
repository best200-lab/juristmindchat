import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Calendar, 
  Tag, 
  Filter,
  SlidersHorizontal,
  Building,
  User,
  ChevronRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddNoteDialog } from "@/components/AddNoteDialog";
import { ReadFullNote } from "@/components/ReadFullNote";

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

export default function JudgeNotes() {
  const [notes, setNotes] = useState<JudgeNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<JudgeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [readNoteOpen, setReadNoteOpen] = useState(false);

  // Get unique categories and courts for filters
  const categories = [...new Set(notes.map(n => n.category))].filter(Boolean);
  const courts = [...new Set(notes.map(n => n.court))].filter(Boolean);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchTerm, notes, categoryFilter, courtFilter]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-judge-notes', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setNotes(data || []);
      setFilteredNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to fetch case reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = notes;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.judge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.court.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(note => note.category === categoryFilter);
    }

    // Apply court filter
    if (courtFilter !== "all") {
      filtered = filtered.filter(note => note.court === courtFilter);
    }

    setFilteredNotes(filtered);
  };

  const handleReadFullNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setReadNoteOpen(true);
  };

  const truncateContent = (content: string, maxLength: number = 180) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading case reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">Legal Repository</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Latest Cases Report
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Access instant case reports from lawyers directly from the court room. 
            View and download Certified True Copies (CTC) of judgments.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by title, judge, court, or keywords..." 
                className="pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px] h-11">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={courtFilter} onValueChange={setCourtFilter}>
                <SelectTrigger className="w-[180px] h-11">
                  <Building className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Court" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courts</SelectItem>
                  {courts.map((court) => (
                    <SelectItem key={court} value={court}>{court}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AddNoteDialog onNoteAdded={fetchNotes} />
            </div>
          </div>

          {/* Active Filters */}
          {(categoryFilter !== "all" || courtFilter !== "all" || searchTerm) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter("all")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {courtFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {courtFilter}
                  <button onClick={() => setCourtFilter("all")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setCourtFilter("all");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredNotes.length}</span> of {notes.length} case reports
          </p>
        </div>

        {/* Case Reports Grid */}
        <div className="grid gap-4 md:gap-6">
          {filteredNotes.map((note) => (
            <Card 
              key={note.id} 
              className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer overflow-hidden"
              onClick={() => handleReadFullNote(note.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                        {note.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(note.created_at)}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {note.title}
                    </h3>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {note.judge_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    {note.court}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(note.created_at)}
                  </span>
                </div>

                {/* Content Preview */}
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {truncateContent(note.content)}
                </p>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    {note.tags.slice(0, 4).map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{note.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Click to view full report & CTC documents
                  </span>
                  <Button variant="outline" size="sm" className="gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileText className="w-4 h-4" />
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredNotes.length === 0 && !loading && (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm || categoryFilter !== "all" || courtFilter !== "all" 
                  ? 'No matching case reports' 
                  : 'No case reports yet'
                }
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm || categoryFilter !== "all" || courtFilter !== "all"
                  ? 'Try adjusting your search criteria or filters' 
                  : 'Be the first to add a case report and help build our legal repository'
                }
              </p>
              {!(searchTerm || categoryFilter !== "all" || courtFilter !== "all") && (
                <AddNoteDialog onNoteAdded={fetchNotes} />
              )}
            </div>
          )}
        </div>

        <ReadFullNote 
          noteId={selectedNoteId}
          open={readNoteOpen}
          onOpenChange={setReadNoteOpen}
        />
      </div>
    </div>
  );
}
