import { useState } from "react";
import { FileText, Upload, FolderOpen, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Document,
  DocumentUploadForm, 
  DocumentViewer,
  MarketplaceBrowse,
  UserDocuments,
  AdminDocumentReview
} from "@/components/marketplace";

const ADMIN_EMAIL = "ogunseun7@gmail.com";

type TabType = 'browse' | 'upload' | 'my-docs' | 'admin';

export default function Marketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleViewDocument = (doc: Document) => {
    setViewingDocument(doc);
  };

  const handleDownload = (doc: Document) => {
    window.open(doc.file_url, '_blank');
  };

  const handleBackFromViewer = () => {
    setViewingDocument(null);
  };

  // If viewing a document, show the viewer
  if (viewingDocument) {
    return (
      <div className="h-full bg-background overflow-hidden">
        <DocumentViewer
          document={viewingDocument}
          onBack={handleBackFromViewer}
          onDownload={handleDownload}
          previewOnly={viewingDocument.page_count > 5}
        />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'browse', label: 'Browse', icon: <FileText className="w-4 h-4" />, show: true },
    { id: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" />, show: true },
    { id: 'my-docs', label: 'My Documents', icon: <FolderOpen className="w-4 h-4" />, show: true },
    { id: 'admin', label: 'Admin', icon: <Settings className="w-4 h-4" />, show: isAdmin },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[hsl(30,10%,98%)]">
      {/* Clean Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-12">
          <div className="flex items-center gap-4">
            <FileText className="w-7 h-7 text-foreground" strokeWidth={1.5} />
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
                Document Marketplace
              </h1>
              <p className="text-muted-foreground mt-1 text-base">
                Browse, share, and download free legal documents and templates
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex gap-1">
            {tabs.filter(t => t.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-[3px] -mb-px ${
                  activeTab === tab.id
                    ? 'border-[hsl(168,80%,32%)] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:py-10">
        {activeTab === 'browse' && (
          <MarketplaceBrowse onViewDocument={handleViewDocument} />
        )}

        {activeTab === 'upload' && (
          <DocumentUploadForm onSuccess={() => setActiveTab("my-docs")} />
        )}

        {activeTab === 'my-docs' && (
          <UserDocuments onView={handleViewDocument} />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminDocumentReview />
        )}
      </main>
    </div>
  );
}