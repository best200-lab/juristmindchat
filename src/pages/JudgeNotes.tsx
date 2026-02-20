import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Calendar, 
  Tag, 
  Filter,
  Building,
  User,
  ChevronRight,
  Clock,
  X,
  SlidersHorizontal
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const categories = [...new Set(notes.map(n => n.category))].filter(Boolean);
  const courts = [...new Set(notes.map(n => n.court))].filter(Boolean);

  const activeFilterCount = [
    categoryFilter !== "all",
    courtFilter !== "all",
    searchTerm !== ""
  ].filter(Boolean).length;

  useEffect(() => { fetchNotes(); }, []);
  useEffect(() => { handleSearch(); }, [searchTerm, notes, categoryFilter, courtFilter]);

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
    if (categoryFilter !== "all") {
      filtered = filtered.filter(note => note.category === categoryFilter);
    }
    if (courtFilter !== "all") {
      filtered = filtered.filter(note => note.court === courtFilter);
    }
    setFilteredNotes(filtered);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setCourtFilter("all");
  };

  const handleReadFullNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setReadNoteOpen(true);
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
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
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return formatDate(dateStr);
  };

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">Loading case reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">

        {/* ── Header ── */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium uppercase tracking-wider">
              Legal Repository
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-3">
            Latest Cases Report
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
            Access instant case reports from lawyers directly from the court room.
            First decentralized Legal Reporting Platform...
            View and download Certified True Copies (CTC) of judgments.
          </p>
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="bg-card border rounded-xl p-3 md:p-4 mb-6 md:mb-8 shadow-sm">

          {/* Mobile: search + filter button row */}
          <div className="flex gap-2 md:hidden">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                className="pl-9 h-10 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile filter sheet trigger */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 px-3 relative shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-left">Filter Cases</SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Court</label>
                    <Select value={courtFilter} onValueChange={setCourtFilter}>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="All Courts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courts</SelectItem>
                        {courts.map((court) => (
                          <SelectItem key={court} value={court}>{court}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setCategoryFilter("all");
                        setCourtFilter("all");
                        setFilterSheetOpen(false);
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setFilterSheetOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <AddNoteDialog onNoteAdded={fetchNotes} />
          </div>

          {/* Desktop: full filter row */}
          <div className="hidden md:flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, judge, court, or keywords..."
                className="pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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

          {/* Active filter chips — shown on both */}
          {(categoryFilter !== "all" || courtFilter !== "all" || searchTerm) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">Filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  "{searchTerm.length > 15 ? searchTerm.substring(0, 15) + "..." : searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {courtFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {courtFilter}
                  <button onClick={() => setCourtFilter("all")} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* ── Results Count ── */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <p className="text-xs md:text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{filteredNotes.length}</span>
            {" "}of {notes.length} reports
          </p>
        </div>

        {/* ── Case Cards ── */}
        <div className="grid gap-3 md:gap-6">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="group hover:shadow-lg active:scale-[0.99] transition-all duration-200 border-2 hover:border-primary/20 cursor-pointer overflow-hidden"
              onClick={() => handleReadFullNote(note.id)}
            >
              <CardHeader className="pb-2 md:pb-3 p-4 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Category + time row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20 text-xs"
                      >
                        {note.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(note.created_at)}
                      </span>
                    </div>
                    {/* Title */}
                    <h3 className="text-base md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {note.title}
                    </h3>
                  </div>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </CardHeader>

              <CardContent className="pt-0 p-4 md:p-6 md:pt-0">
                {/* Metadata — stacked on mobile, inline on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-x-4 md:gap-y-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                  <span className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{note.judge_name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 truncate">
                    <Building className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{note.court}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {formatDate(note.created_at)}
                  </span>
                </div>

                {/* Content preview — shorter on mobile */}
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 leading-relaxed line-clamp-3 md:line-clamp-none">
                  {truncateContent(note.content, window.innerWidth < 768 ? 120 : 180)}
                </p>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-3 md:mb-0">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {note.tags.slice(0, window.innerWidth < 768 ? 2 : 4).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > (window.innerWidth < 768 ? 2 : 4) && (
                      <span className="text-xs text-muted-foreground">
                        +{note.tags.length - (window.innerWidth < 768 ? 2 : 4)} more
                      </span>
                    )}
                  </div>
                )}

                {/* CTA — hidden on mobile to save space, tap the card instead */}
                <div className="hidden md:flex mt-4 pt-4 border-t items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Click to view full report & CTC documents
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Report
                  </Button>
                </div>

                {/* Mobile tap hint */}
                <div className="md:hidden mt-2 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    Tap to view full report
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* ── Empty State ── */}
          {filteredNotes.length === 0 && !loading && (
            <div className="text-center py-12 md:py-16 px-4 md:px-6">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 md:mb-6">
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                {searchTerm || categoryFilter !== "all" || courtFilter !== "all"
                  ? 'No matching case reports'
                  : 'No case reports yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {searchTerm || categoryFilter !== "all" || courtFilter !== "all"
                  ? 'Try adjusting your search criteria or filters'
                  : 'Be the first to add a case report and help build our legal repository'}
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