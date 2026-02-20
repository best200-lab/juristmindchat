import { useState } from "react";
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function DocumentUploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ title?: string; file?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { title?: string; file?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > 100) {
      newErrors.title = "Title must be 100 characters or less";
    }

    if (!file) {
      newErrors.file = "Please select a PDF file";
    } else if (file.type !== "application/pdf") {
      newErrors.file = "Only PDF files are allowed";
    } else if (file.size > MAX_FILE_SIZE) {
      newErrors.file = "File size must be 5MB or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setErrors({ ...errors, file: "Only PDF files are allowed" });
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        setErrors({ ...errors, file: "File size must be 5MB or less" });
        return;
      }
      setFile(selectedFile);
      setErrors({ ...errors, file: undefined });
    }
  };

  const removeFile = () => {
    setFile(null);
    setErrors({ ...errors, file: undefined });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !file || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('marketplace-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('marketplace-documents')
        .getPublicUrl(fileName);

      // Get user profile for uploader name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          file_url: urlData.publicUrl,
          file_path: fileName,
          uploader_id: user.id,
          uploader_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous',
          file_size: file.size,
          page_count: 0, // Will be updated later if needed
        });

      if (insertError) throw insertError;

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success("Your document has been submitted for review. You'll be notified once it's approved.");
      
      // Reset form
      setTitle("");
      setDescription("");
      setFile(null);
      setUploadProgress(0);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Submit Document
        </CardTitle>
        <CardDescription>
          Share your document with the community. All submissions are reviewed before publishing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={uploading}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {errors.title && <span className="text-destructive">{errors.title}</span>}
              <span className="ml-auto">{title.length}/100</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={uploading}
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Document <span className="text-destructive">*</span></Label>
            
            {!file ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${errors.file ? 'border-destructive' : 'border-border hover:border-primary'}`}
                onClick={() => document.getElementById('doc-upload')?.click()}
              >
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF only, max 5MB</p>
                <input
                  id="doc-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                {!uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {errors.file && (
              <p className="text-xs text-destructive">{errors.file}</p>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={uploading || !title.trim() || !file}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit for Review
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}