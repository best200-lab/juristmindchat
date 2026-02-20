import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CTCUploadModalProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

interface UploadMetadata {
  judgment_date: string;
  issuing_court: string;
  bench_judge_name: string;
  case_reference: string;
}

export function CTCUploadModal({ noteId, open, onOpenChange, onUploadComplete }: CTCUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    judgment_date: "",
    issuing_court: "",
    bench_judge_name: "",
    case_reference: "",
  });

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 15MB";
    }
    return null;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!metadata.judgment_date || !metadata.issuing_court || !metadata.bench_judge_name) {
      toast.error("Please fill in all required metadata fields");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Step 1: Get upload URL from edge function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('manage-ctc', {
        body: {
          action: 'upload',
          noteId,
          fileName: file.name,
          fileSize: file.size,
          metadata,
        },
      });

      if (uploadError) throw uploadError;
      setProgress(30);

      // Step 2: Upload file to storage using signed URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setProgress(100);
      toast.success('CTC document uploaded successfully!');
      
      // Reset form
      setFile(null);
      setMetadata({
        judgment_date: "",
        issuing_court: "",
        bench_judge_name: "",
        case_reference: "",
      });
      
      onUploadComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload CTC document');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="w-5 h-5 text-primary" />
            Upload Certified True Copy (CTC)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('ctc-file-input')?.click()}
          >
            <input
              id="ctc-file-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-10 h-10 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-foreground font-medium mb-1">
                  Drag and drop your PDF here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse (max 15MB)
                </p>
              </>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="judgment_date" className="text-sm font-medium">
                  Judgment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="judgment_date"
                  type="date"
                  value={metadata.judgment_date}
                  onChange={(e) => setMetadata({ ...metadata, judgment_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="case_reference" className="text-sm font-medium">
                  Case Reference
                </Label>
                <Input
                  id="case_reference"
                  placeholder="e.g., SC/123/2024"
                  value={metadata.case_reference}
                  onChange={(e) => setMetadata({ ...metadata, case_reference: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="issuing_court" className="text-sm font-medium">
                Issuing Court <span className="text-destructive">*</span>
              </Label>
              <Input
                id="issuing_court"
                placeholder="e.g., Supreme Court of Nigeria"
                value={metadata.issuing_court}
                onChange={(e) => setMetadata({ ...metadata, issuing_court: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bench_judge_name" className="text-sm font-medium">
                Bench / Judge Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bench_judge_name"
                placeholder="e.g., Hon. Justice John Doe, JSC"
                value={metadata.bench_judge_name}
                onChange={(e) => setMetadata({ ...metadata, bench_judge_name: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Only PDF files are accepted. The document will be securely stored and accessible to all authorized users viewing this case report.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload CTC'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
