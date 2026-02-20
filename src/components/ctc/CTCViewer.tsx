import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  ExternalLink,
  FileText,
  Maximize2,
  RotateCw,
  Calendar,
  Building,
  User,
  Hash,
  Clock,
  HardDrive
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CTCFile {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  version: number;
  judgment_date: string | null;
  issuing_court: string | null;
  bench_judge_name: string | null;
  case_reference: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  is_current: boolean;
}

interface CTCViewerProps {
  ctcFile: CTCFile;
  onClose?: () => void;
}

export function CTCViewer({ ctcFile, onClose }: CTCViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    fetchPdfUrl();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [ctcFile.file_path]);

  const fetchPdfUrl = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-ctc', {
        body: { action: 'get-download-url', filePath: ctcFile.file_path },
      });

      if (error) throw error;
      setPdfUrl(data.url);
    } catch (error) {
      console.error('Error fetching PDF URL:', error);
      toast.error('Failed to load PDF document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;
    
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ctcFile.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleOpenNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Certified True Copy (CTC) Judgment
            {!ctcFile.is_current && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                v{ctcFile.version} (archived)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenNewTab} className="gap-1.5">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">New Tab</span>
            </Button>
            <Button variant="default" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Metadata Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 border-b">
          {ctcFile.judgment_date && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Judgment Date</p>
                <p className="text-sm font-medium">{formatDate(ctcFile.judgment_date)}</p>
              </div>
            </div>
          )}
          {ctcFile.issuing_court && (
            <div className="flex items-start gap-2">
              <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Issuing Court</p>
                <p className="text-sm font-medium">{ctcFile.issuing_court}</p>
              </div>
            </div>
          )}
          {ctcFile.bench_judge_name && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Bench / Judge</p>
                <p className="text-sm font-medium">{ctcFile.bench_judge_name}</p>
              </div>
            </div>
          )}
          {ctcFile.case_reference && (
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Case Reference</p>
                <p className="text-sm font-medium">{ctcFile.case_reference}</p>
              </div>
            </div>
          )}
        </div>

        {/* PDF Viewer Controls */}
        <div className="flex items-center justify-between p-3 border-b bg-background">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[80px] text-center">
              Page {currentPage} of {numPages || '?'}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))}
              disabled={!numPages || currentPage >= numPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.min(2, scale + 0.25))}
              disabled={scale >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(1)}
              title="Reset zoom"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Display */}
        <div className="relative bg-slate-100 dark:bg-slate-900 min-h-[500px] max-h-[700px] overflow-auto flex justify-center p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          ) : pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <Skeleton className="h-[600px] w-[450px]" />
                </div>
              }
              error={
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-destructive">Failed to load PDF</p>
                  <Button variant="outline" onClick={fetchPdfUrl} className="mt-4">
                    Retry
                  </Button>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="shadow-lg"
                loading={<Skeleton className="h-[600px] w-[450px]" />}
              />
            </Document>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No document available</p>
            </div>
          )}
        </div>

        {/* File Info Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-muted/30 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {ctcFile.file_name}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              {formatFileSize(ctcFile.file_size)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Uploaded by {ctcFile.uploaded_by_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(ctcFile.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
