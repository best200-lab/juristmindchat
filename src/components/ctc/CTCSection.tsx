import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  FileText, 
  ChevronDown, 
  History, 
  MessageSquare,
  Clock,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CTCUploadModal } from "./CTCUploadModal";
import { CTCViewer } from "./CTCViewer";
import { CTCComments } from "./CTCComments";
import { CTCAuditLog } from "./CTCAuditLog";

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

interface CTCSectionProps {
  noteId: string;
}

export function CTCSection({ noteId }: CTCSectionProps) {
  const [ctcFiles, setCtcFiles] = useState<CTCFile[]>([]);
  const [currentFile, setCurrentFile] = useState<CTCFile | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("current");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  useEffect(() => {
    fetchCTCFiles();
  }, [noteId]);

  const fetchCTCFiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-ctc', {
        body: { action: 'list', noteId, includeHistory: true },
      });

      if (error) throw error;
      
      setCtcFiles(data || []);
      const current = data?.find((f: CTCFile) => f.is_current) || data?.[0];
      setCurrentFile(current || null);
    } catch (error) {
      console.error('Error fetching CTC files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    if (version === "current") {
      setCurrentFile(ctcFiles.find(f => f.is_current) || ctcFiles[0]);
    } else {
      setCurrentFile(ctcFiles.find(f => f.version.toString() === version) || null);
    }
  };

  const hasMultipleVersions = ctcFiles.length > 1;

  if (loading) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-2 overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Certified True Copy (CTC) Judgment</span>
                  {currentFile && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                      Available
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadModalOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    {currentFile ? 'Upload New Version' : 'Upload CTC'}
                  </Button>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                  />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {currentFile ? (
                <div className="space-y-4">
                  {/* Version Selector */}
                  {hasMultipleVersions && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <History className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Version:</span>
                      <Select value={selectedVersion} onValueChange={handleVersionChange}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current">
                            Current (v{ctcFiles.find(f => f.is_current)?.version})
                          </SelectItem>
                          {ctcFiles.filter(f => !f.is_current).map((file) => (
                            <SelectItem key={file.id} value={file.version.toString()}>
                              Version {file.version} - {new Date(file.created_at).toLocaleDateString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">
                        {ctcFiles.length} version{ctcFiles.length > 1 ? 's' : ''} available
                      </span>
                    </div>
                  )}

                  {/* PDF Viewer */}
                  <CTCViewer ctcFile={currentFile} />

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                      className="gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Comments & Annotations
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAuditLog(!showAuditLog)}
                      className="gap-1.5"
                    >
                      <Clock className="w-4 h-4" />
                      Audit Trail
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {showComments && currentFile && (
                    <CTCComments ctcFileId={currentFile.id} />
                  )}

                  {/* Audit Log Section */}
                  {showAuditLog && (
                    <CTCAuditLog noteId={noteId} />
                  )}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No CTC Document Uploaded</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Upload a Certified True Copy (CTC) of the judgment to make it accessible 
                    for viewing and download by authorized users.
                  </p>
                  <Button onClick={() => setUploadModalOpen(true)} className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload CTC Document
                  </Button>
                  
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg text-left max-w-md mx-auto">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Accepted Format:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>PDF files only</li>
                          <li>Maximum file size: 15MB</li>
                          <li>Required: Judgment date, court, and judge name</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <CTCUploadModal
        noteId={noteId}
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={fetchCTCFiles}
      />
    </div>
  );
}
