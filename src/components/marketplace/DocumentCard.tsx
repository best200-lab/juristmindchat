import { FileText, Eye, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Document } from "./types";

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  showStatus?: boolean;
}

export function DocumentCard({ document, onView, showStatus = false }: DocumentCardProps) {
  const truncateDescription = (text: string | null, maxLength: number = 100): string => {
    if (!text) return "No description available";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const getStatusStyles = () => {
    switch (document.status) {
      case 'active':
        return 'bg-[hsl(145,35%,38%)] text-white';
      case 'pending':
        return 'bg-[hsl(35,90%,52%)] text-[hsl(35,40%,15%)]';
      case 'rejected':
        return 'bg-[hsl(0,60%,50%)] text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="marketplace-card flex flex-col h-full overflow-hidden">
      {/* Document Preview Area */}
      <div className="marketplace-preview h-60 flex items-center justify-center relative">
        <FileText className="w-16 h-16 text-muted-foreground/40" strokeWidth={1.5} />
        
        {/* Status Badge - Only show when requested */}
        {showStatus && (
          <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded ${getStatusStyles()}`}>
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-2 mb-2 tracking-tight">
          {document.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
          {truncateDescription(document.description)}
        </p>

        {/* Metadata Row */}
        <div className="flex items-center text-xs text-muted-foreground/70 mb-4">
          {document.page_count > 0 && (
            <>
              <FileText className="w-3.5 h-3.5 mr-1" />
              <span>{document.page_count} pages</span>
              <span className="mx-2 marketplace-separator">•</span>
            </>
          )}
          <Calendar className="w-3.5 h-3.5 mr-1" />
          <span>
            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onView(document)}
          className="w-full marketplace-btn-primary py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Document
        </button>
      </div>
    </div>
  );
}