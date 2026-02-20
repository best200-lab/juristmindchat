import { useState, useEffect } from "react";
import { Search, ChevronDown, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Document } from "./types";
import { DocumentCard } from "./DocumentCard";
import { DocumentCardSkeleton } from "./DocumentCardSkeleton";

interface MarketplaceBrowseProps {
  onViewDocument: (doc: Document) => void;
}

type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'most_viewed';

const sortLabels: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title_asc: 'Title (A-Z)',
  title_desc: 'Title (Z-A)',
  most_viewed: 'Most viewed'
};

export function MarketplaceBrowse({ onViewDocument }: MarketplaceBrowseProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchDocuments(true);
  }, [sortBy]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchDocuments(true);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchDocuments = async (reset: boolean = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('title', { ascending: false });
          break;
        case 'most_viewed':
          query = query.order('view_count', { ascending: false });
          break;
      }

      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const newDocs = (data as Document[]) || [];
      
      if (reset) {
        setDocuments(newDocs);
        setPage(1);
      } else {
        setDocuments(prev => [...prev, ...newDocs]);
      }

      setTotalCount(count || 0);
      setHasMore(newDocs.length === ITEMS_PER_PAGE && (from + newDocs.length) < (count || 0));
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchDocuments(false);
  };

  const handleDownload = async (doc: Document) => {
    try {
      await supabase.rpc('increment_document_downloads', { doc_id: doc.id });
      window.open(doc.file_url, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      window.open(doc.file_url, '_blank');
    }
  };

  const handleView = async (doc: Document) => {
    try {
      await supabase.rpc('increment_document_views', { doc_id: doc.id });
    } catch (error) {
      console.error('View count error:', error);
    }
    onViewDocument(doc);
  };

  return (
    <div className="space-y-8">
      {/* Search and Sort Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 marketplace-input transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="h-11 px-4 bg-card border border-border rounded-lg flex items-center gap-2 text-sm text-muted-foreground hover:border-foreground/20 transition-colors min-w-[180px] justify-between"
          >
            <span>Sort by: {sortLabels[sortBy]}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {showSortDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowSortDropdown(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                      sortBy === option ? 'text-[hsl(168,80%,32%)] font-medium' : 'text-foreground'
                    }`}
                  >
                    {sortLabels[option]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          Showing {documents.length} of {totalCount} documents
        </p>
      )}

      {/* Documents Grid */}
      {loading && documents.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <DocumentCardSkeleton key={i} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-foreground mb-2">No documents found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleView}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-8">
              <button 
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}