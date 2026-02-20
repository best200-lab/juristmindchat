export interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_path: string;
  status: 'pending' | 'active' | 'rejected';
  uploader_id: string;
  uploader_name: string | null;
  page_count: number;
  file_size: number;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
}

export interface DocumentUploadForm {
  title: string;
  description: string;
  file: File | null;
}