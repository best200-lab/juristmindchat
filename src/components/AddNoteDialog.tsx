import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Upload, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Building,
  User,
  Calendar,
  Tag,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddNoteDialogProps {
  onNoteAdded: () => void;
}

interface NoteForm {
  title: string;
  judge_name: string;
  court: string;
  category: string;
  content: string;
  tags: string[];
  case_suit_number: string;
}

interface CTCMetadata {
  judgment_date: string;
  issuing_court: string;
  bench_judge_name: string;
  case_reference: string;
}

const CATEGORIES = [
  "Commercial Law",
  "Criminal Law",
  "Constitutional Law",
  "Property Law",
  "Family Law",
  "Labour Law",
  "Tax Law",
  "Environmental Law",
  "Maritime Law",
  "Other"
];

export function AddNoteDialog({ onNoteAdded }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NoteForm>({
    title: "",
    judge_name: "",
    court: "",
    category: "",
    content: "",
    tags: [],
    case_suit_number: ""
  });

  // CTC Upload State
  const [ctcFile, setCtcFile] = useState<File | null>(null);
  const [ctcDragActive, setCtcDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ctcMetadata, setCtcMetadata] = useState<CTCMetadata>({
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
      setCtcDragActive(true);
    } else if (e.type === "dragleave") {
      setCtcDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtcDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const error = validateFile(droppedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setCtcFile(droppedFile);
      // Auto-fill some metadata from form
      if (!ctcMetadata.issuing_court && form.court) {
        setCtcMetadata(prev => ({ ...prev, issuing_court: form.court }));
      }
      if (!ctcMetadata.bench_judge_name && form.judge_name) {
        setCtcMetadata(prev => ({ ...prev, bench_judge_name: form.judge_name }));
      }
      if (!ctcMetadata.case_reference && form.case_suit_number) {
        setCtcMetadata(prev => ({ ...prev, case_reference: form.case_suit_number }));
      }
    }
  }, [form, ctcMetadata]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const error = validateFile(selectedFile);
      if (error) {
        toast.error(error);
        return;
      }
      setCtcFile(selectedFile);
      // Auto-fill metadata from form
      if (!ctcMetadata.issuing_court && form.court) {
        setCtcMetadata(prev => ({ ...prev, issuing_court: form.court }));
      }
      if (!ctcMetadata.bench_judge_name && form.judge_name) {
        setCtcMetadata(prev => ({ ...prev, bench_judge_name: form.judge_name }));
      }
      if (!ctcMetadata.case_reference && form.case_suit_number) {
        setCtcMetadata(prev => ({ ...prev, case_reference: form.case_suit_number }));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagsArray = form.tags.length > 0 ? form.tags : [];
      let uploadedFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileSize: number | null = null;

      // Step 1: Upload CTC file FIRST if provided
      if (ctcFile) {
        // Validate CTC metadata
        if (!ctcMetadata.judgment_date || !ctcMetadata.issuing_court || !ctcMetadata.bench_judge_name) {
          toast.error("Please fill in all required CTC metadata fields");
          setLoading(false);
          return;
        }

        setUploadProgress(10);
        
        // Generate a unique file path
        const fileExt = ctcFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `ctc-uploads/${fileName}`;

        // Get upload URL
        const { data: urlData, error: urlError } = await supabase.functions.invoke('manage-ctc', {
          body: {
            action: 'get-upload-url',
            filePath,
            contentType: ctcFile.type
          }
        });

        if (urlError || !urlData?.signedUrl) {
          throw new Error('Failed to get upload URL');
        }

        setUploadProgress(30);

        // Upload the file to storage
        const uploadResponse = await fetch(urlData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/pdf' },
          body: ctcFile,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload CTC file');
        }

        uploadedFilePath = filePath;
        uploadedFileName = ctcFile.name;
        uploadedFileSize = ctcFile.size;
        setUploadProgress(50);
      }

      // Step 2: Create the note
      setUploadProgress(60);
      const { data: noteData, error: noteError } = await supabase.functions.invoke('manage-judge-notes', {
        body: {
          action: 'create',
          noteData: {
            ...form,
            tags: tagsArray
          }
        }
      });

      if (noteError) throw noteError;
      setUploadProgress(80);

      // Step 3: Create CTC record if file was uploaded
      if (uploadedFilePath && noteData?.id) {
        const { error: ctcError } = await supabase.functions.invoke('manage-ctc', {
          body: {
            action: 'create',
            noteId: noteData.id,
            fileName: uploadedFileName,
            filePath: uploadedFilePath,
            fileSize: uploadedFileSize,
            mimeType: 'application/pdf',
            metadata: {
              judgment_date: ctcMetadata.judgment_date,
              issuing_court: ctcMetadata.issuing_court,
              bench_judge_name: ctcMetadata.bench_judge_name,
              case_reference: ctcMetadata.case_reference || null
            }
          }
        });

        if (ctcError) {
          console.error('CTC record creation failed:', ctcError);
        }
      }

      setUploadProgress(100);
      toast.success('Case report published successfully!');
      handleClose();
      onNoteAdded();
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error(error.message || 'Failed to add case report');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(s => s.trim()).filter(s => s);
    setForm({ ...form, tags });
  };

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setForm({
      title: "",
      judge_name: "",
      court: "",
      category: "",
      content: "",
      tags: [],
      case_suit_number: ""
    });
    setCtcFile(null);
    setCtcMetadata({
      judgment_date: "",
      issuing_court: "",
      bench_judge_name: "",
      case_reference: "",
    });
  };

  const canProceedToStep2 = form.title && form.judge_name && form.court && form.category && form.content;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-6">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        <FileText className="w-4 h-4" />
        <span className="text-sm font-medium">Case Details</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        <Upload className="w-4 h-4" />
        <span className="text-sm font-medium">Upload CTC</span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Report Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g., Landmark ruling on property rights"
          className="h-11"
          required
        />
      </div>

      {/* Case Suit Number */}
      <div className="space-y-2">
        <Label htmlFor="case_suit_number" className="text-sm font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Case Suit Number
        </Label>
        <Input
          id="case_suit_number"
          value={form.case_suit_number}
          onChange={(e) => setForm({ ...form, case_suit_number: e.target.value })}
          placeholder="e.g., FCT/HC/CV/123/2024"
          className="h-11"
        />
      </div>

      {/* Judge & Court Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="judge_name" className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Judge Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="judge_name"
            value={form.judge_name}
            onChange={(e) => setForm({ ...form, judge_name: e.target.value })}
            placeholder="Hon. Justice..."
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="court" className="text-sm font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground" />
            Court <span className="text-destructive">*</span>
          </Label>
          <Input
            id="court"
            value={form.court}
            onChange={(e) => setForm({ ...form, court: e.target.value })}
            placeholder="High Court, Federal High Court, etc."
            className="h-11"
            required
          />
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Category <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={form.category === cat ? "default" : "outline"}
              className={`cursor-pointer transition-all hover:scale-105 ${
                form.category === cat 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-primary/10 hover:border-primary'
              }`}
              onClick={() => setForm({ ...form, category: cat })}
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Content Field */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium">
          Case Report Content <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="content"
          rows={6}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Enter the detailed case report content..."
          className="resize-none"
          required
          maxLength={5000}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Write a comprehensive summary of the case</span>
          <span>{form.content.length}/5000</span>
        </div>
      </div>

      {/* Tags Field */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-sm font-medium flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          Tags (comma-separated)
        </Label>
        <Input
          id="tags"
          value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
          onChange={(e) => handleTagsChange(e.target.value)}
          placeholder="e.g., Contract Law, Evidence, Procedure"
          className="h-11"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Attach Certified True Copy (CTC)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload the official CTC document to make your case report more credible and useful
          </p>
        </div>
      </div>

      {/* File Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          ctcDragActive
            ? "border-primary bg-primary/5"
            : ctcFile
            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('ctc-file-input-add')?.click()}
      >
        <input
          id="ctc-file-input-add"
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {ctcFile ? (
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-7 h-7 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">{ctcFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(ctcFile.size)}</p>
              <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Check className="w-3 h-3 mr-1" /> Ready to upload
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setCtcFile(null);
              }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">
              Drag and drop your PDF here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (max 15MB)
            </p>
          </>
        )}
      </div>

      {/* CTC Metadata Fields - Only show if file is selected */}
      {ctcFile && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Document Details
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctc_judgment_date" className="text-sm">
                Judgment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ctc_judgment_date"
                type="date"
                value={ctcMetadata.judgment_date}
                onChange={(e) => setCtcMetadata({ ...ctcMetadata, judgment_date: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctc_case_reference" className="text-sm">
                Case Reference
              </Label>
              <Input
                id="ctc_case_reference"
                placeholder="e.g., SC/123/2024"
                value={ctcMetadata.case_reference}
                onChange={(e) => setCtcMetadata({ ...ctcMetadata, case_reference: e.target.value })}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctc_issuing_court" className="text-sm">
              Issuing Court <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ctc_issuing_court"
              placeholder="e.g., Supreme Court of Nigeria"
              value={ctcMetadata.issuing_court}
              onChange={(e) => setCtcMetadata({ ...ctcMetadata, issuing_court: e.target.value })}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctc_bench_judge_name" className="text-sm">
              Bench / Judge Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ctc_bench_judge_name"
              placeholder="e.g., Hon. Justice John Doe, JSC"
              value={ctcMetadata.bench_judge_name}
              onChange={(e) => setCtcMetadata({ ...ctcMetadata, bench_judge_name: e.target.value })}
              className="h-10"
            />
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {loading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uploading CTC...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Skip Option */}
      {!ctcFile && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            CTC upload is optional. You can always add it later from the case report view.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Case Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            Add New Case Report
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {step === 1 ? renderStep1() : renderStep2()}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 mt-6 border-t">
            {step === 1 ? (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="flex-1 gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || (ctcFile && (!ctcMetadata.judgment_date || !ctcMetadata.issuing_court || !ctcMetadata.bench_judge_name))}
                  className="flex-1 gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {ctcFile ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {ctcFile ? 'Submit with CTC' : 'Submit Report'}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
