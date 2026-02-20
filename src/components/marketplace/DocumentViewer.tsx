import { useState } from "react";
import { 
  ZoomIn, ZoomOut, Download, ArrowLeft, Loader2, 
  AlertCircle, ExternalLink, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Document as DocType } from "./types";

interface DocumentViewerProps {
  document: DocType;
  onBack: () => void;
  onDownload: (doc: DocType) => void;
  previewOnly?: boolean;
}

export function DocumentViewer({ document, onBack, onDownload, previewOnly = false }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(100);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load document. Try downloading instead.');
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setScale(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setScale(100);

  // Google Docs viewer URL for PDF rendering
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(document.file_url)}&embedded=true`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="font-semibold text-lg line-clamp-1">{document.title}</h1>
            {document.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{document.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 50}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[50px] text-center">{scale}%</span>
            <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 200}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetZoom}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => onDownload(document)}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open(document.file_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto bg-muted/30 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        )}

        {error ? (
          <Card className="max-w-md mx-auto p-6 text-center mt-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => onDownload(document)}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open(document.file_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </Card>
        ) : (
          <div 
            className="w-full h-full flex justify-center p-4"
            style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={googleViewerUrl}
              className="w-full max-w-4xl h-full min-h-[800px] bg-white rounded-lg shadow-lg"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={document.title}
            />
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden flex items-center justify-between p-2 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{scale}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 200}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onDownload(document)}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.open(document.file_url, '_blank')}>
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}