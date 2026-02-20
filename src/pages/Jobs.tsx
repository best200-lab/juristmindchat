import { useState, useEffect } from "react";
import { 
  Briefcase, MapPin, Clock, Plus, Filter, Users, Trash2, 
  Search, BookmarkPlus, Bookmark, Share2, ChevronDown,
  Building2, DollarSign, Calendar, Eye, CheckCircle2,
  TrendingUp, Star, Bell, X, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { showToast } from "@/lib/toast";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_range?: string;
  description: string;
  created_at: string;
  applications_count: number;
  posted_by: string;
}

interface JobForm {
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_range: string;
  description: string;
  requirements: string;
  benefits: string;
  experience_level: string;
  deadline: string;
}

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Remote", "Hybrid", "Internship"];
const EXPERIENCE_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Partner", "Director"];
const PRACTICE_AREAS = [
  "Corporate Law", "Criminal Law", "Family Law", "Real Estate",
  "Intellectual Property", "Tax Law", "Labour Law", "Litigation", "Conveyancing"
];

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("find");
  const [jobForm, setJobForm] = useState<JobForm>({
    title: "",
    company: "",
    location: "",
    job_type: "",
    salary_range: "",
    description: "",
    requirements: "",
    benefits: "",
    experience_level: "",
    deadline: "",
  });

  useEffect(() => { fetchJobs(); }, []);

  // Load saved/applied jobs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedJobs');
    const applied = localStorage.getItem('appliedJobs');
    if (saved) setSavedJobs(new Set(JSON.parse(saved)));
    if (applied) setAppliedJobs(new Set(JSON.parse(applied)));
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-jobs', {
        body: { action: 'list-jobs' }
      });
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-jobs', {
        body: { action: 'create-job', jobData: jobForm }
      });
      if (error) throw error;
      toast.success('Job posted successfully!');
      setJobForm({
        title: "", company: "", location: "", job_type: "",
        salary_range: "", description: "", requirements: "",
        benefits: "", experience_level: "", deadline: "",
      });
      setActiveTab("find");
      fetchJobs();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyJob = async (job: Job) => {
    if (!user) {
      toast.error('You must be logged in to apply');
      return;
    }
    try {
      const { data: posterData } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('user_id', job.posted_by)
        .single();

      const posterEmail = posterData?.email || '';
      const posterName = posterData?.display_name || 'Hiring Manager';

      const subject = encodeURIComponent(`Application: ${job.title}`);
      const body = encodeURIComponent(
`Dear ${posterName},

My name is [Your Name]. I am reaching out regarding the "${job.title}" position listed on Jurist Mind.
Please find my resume attached.

Best regards,
[Your Name]`
      );
      window.location.href = `mailto:${posterEmail}?subject=${subject}&body=${body}`;

      // Mark as applied
      const newApplied = new Set(appliedJobs).add(job.id);
      setAppliedJobs(newApplied);
      localStorage.setItem('appliedJobs', JSON.stringify([...newApplied]));
      showToast('Opening email client…');
    } catch (error: any) {
      showToast('Could not open email client. Please try again.', 5000);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    try {
      const { error } = await supabase.functions.invoke('manage-jobs', {
        body: { action: 'delete-job', jobId }
      });
      if (error) throw error;
      toast.success('Job deleted successfully.');
      fetchJobs();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete job');
    }
  };

  const toggleSaveJob = (jobId: string) => {
    const newSaved = new Set(savedJobs);
    if (newSaved.has(jobId)) {
      newSaved.delete(jobId);
      toast.success('Job removed from saved');
    } else {
      newSaved.add(jobId);
      toast.success('Job saved!');
    }
    setSavedJobs(newSaved);
    localStorage.setItem('savedJobs', JSON.stringify([...newSaved]));
  };

  const handleShareJob = (job: Job) => {
    const text = `Check out this legal job: ${job.title} at ${job.company}`;
    if (navigator.share) {
      navigator.share({ title: job.title, text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${text} - ${window.location.href}`);
      toast.success('Link copied to clipboard!');
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation =
      locationFilter === "" ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesType =
      jobTypeFilter === "all" ||
      job.job_type.toLowerCase() === jobTypeFilter.toLowerCase();
    return matchesSearch && matchesLocation && matchesType;
  });

  const savedJobsList = jobs.filter(j => savedJobs.has(j.id));
  const myPostedJobs = jobs.filter(j => j.posted_by === user?.id);

  const activeFilterCount = [
    jobTypeFilter !== "all",
    experienceFilter !== "all",
    locationFilter !== "",
  ].filter(Boolean).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getJobTypeBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'remote') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (t === 'full-time') return 'bg-primary/10 text-primary border-primary/20';
    if (t === 'part-time') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (t === 'contract') return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    if (t === 'hybrid') return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  // ── Stats bar ─────────────────────────────────────────────────
  const stats = [
    { label: "Total Jobs", value: jobs.length, icon: Briefcase },
    { label: "Saved", value: savedJobs.size, icon: Bookmark },
    { label: "Applied", value: appliedJobs.size, icon: CheckCircle2 },
    { label: "My Posts", value: myPostedJobs.length, icon: TrendingUp },
  ];

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">

        {/* ── Header ── */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium uppercase tracking-wider">
              Legal Career Hub
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Find Legal Jobs
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Curated legal career opportunities across Nigeria and beyond.
          </p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border rounded-xl p-3 md:p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card border rounded-xl p-1 mb-6 h-auto">
            <TabsTrigger value="find" className="rounded-lg text-xs md:text-sm py-2">
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Browse Jobs
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg text-xs md:text-sm py-2">
              <Bookmark className="w-3.5 h-3.5 mr-1.5" />
              Saved
              {savedJobs.size > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {savedJobs.size}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="post" className="rounded-lg text-xs md:text-sm py-2">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Post Job
            </TabsTrigger>
          </TabsList>

          {/* ══ FIND JOBS ══ */}
          <TabsContent value="find" className="space-y-4">

            {/* Search + filter bar */}
            <div className="bg-card border rounded-xl p-3 md:p-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs, companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Mobile filter sheet */}
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 px-3 relative md:hidden shrink-0">
                      <SlidersHorizontal className="w-4 h-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                    <SheetHeader className="mb-4">
                      <SheetTitle className="text-left">Filter Jobs</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Location</label>
                        <Input
                          placeholder="City, State..."
                          value={locationFilter}
                          onChange={(e) => setLocationFilter(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Job Type</label>
                        <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {JOB_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Experience Level</label>
                        <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            {EXPERIENCE_LEVELS.map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setLocationFilter("");
                            setJobTypeFilter("all");
                            setExperienceFilter("all");
                            setFilterSheetOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                        <Button className="flex-1" onClick={() => setFilterSheetOpen(false)}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Desktop filters */}
              <div className="hidden md:flex gap-3 flex-wrap">
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="pl-9 h-9 w-40 text-sm"
                  />
                </div>
                <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                  <SelectTrigger className="h-9 w-36 text-sm">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {JOB_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue placeholder="Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {EXPERIENCE_LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(locationFilter || jobTypeFilter !== "all" || experienceFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => {
                      setLocationFilter("");
                      setJobTypeFilter("all");
                      setExperienceFilter("all");
                    }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-muted-foreground px-1">
              Showing <span className="font-semibold text-foreground">{filteredJobs.length}</span> of {jobs.length} jobs
            </p>

            {/* Job cards */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
                <p className="mt-3 text-sm text-muted-foreground">Loading jobs...</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {filteredJobs.map((job) => (
                  <Card
                    key={job.id}
                    className={`border-2 transition-all duration-200 overflow-hidden ${
                      expandedJob === job.id
                        ? 'border-primary/30 shadow-lg'
                        : 'hover:border-primary/20 hover:shadow-md'
                    } ${appliedJobs.has(job.id) ? 'opacity-80' : ''}`}
                  >
                    {/* Applied banner */}
                    {appliedJobs.has(job.id) && (
                      <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-1.5 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">You applied to this job</span>
                      </div>
                    )}

                    <CardHeader className="p-4 md:p-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Company logo placeholder + info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-semibold text-foreground leading-tight mb-0.5 line-clamp-1">
                              {job.title}
                            </h3>
                            <p className="text-sm text-muted-foreground font-medium">{job.company}</p>
                          </div>
                        </div>

                        {/* Save + Share buttons */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleSaveJob(job.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors"
                            title={savedJobs.has(job.id) ? "Unsave" : "Save job"}
                          >
                            {savedJobs.has(job.id)
                              ? <Bookmark className="w-4 h-4 text-primary fill-primary" />
                              : <BookmarkPlus className="w-4 h-4 text-muted-foreground" />
                            }
                          </button>
                          <button
                            onClick={() => handleShareJob(job)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors"
                            title="Share job"
                          >
                            <Share2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant="outline" className={`text-xs ${getJobTypeBadgeColor(job.job_type)}`}>
                          <Briefcase className="w-3 h-3 mr-1" />
                          {job.job_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 mr-1" />
                          {job.location}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(job.created_at)}
                        </Badge>
                        {job.salary_range && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/20 bg-primary/5">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {job.salary_range}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-4 md:px-5 pb-4 pt-0">
                      {/* Description */}
                      <p className={`text-sm text-muted-foreground leading-relaxed mb-3 ${
                        expandedJob === job.id ? '' : 'line-clamp-2'
                      }`}>
                        {job.description}
                      </p>

                      {/* Expand/collapse */}
                      <button
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
                      >
                        {expandedJob === job.id ? 'Show less' : 'Read more'}
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {job.applications_count} applied
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {user?.id === job.posted_by && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                              className="h-8 px-3 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete
                            </Button>
                          )}
                          {user ? (
                            <Button
                              onClick={() => handleApplyJob(job)}
                              size="sm"
                              disabled={appliedJobs.has(job.id)}
                              className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60"
                            >
                              {appliedJobs.has(job.id) ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Applied
                                </>
                              ) : 'Apply Now'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-4 text-xs"
                              onClick={() => window.location.href = '/auth'}
                            >
                              Login to Apply
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredJobs.length === 0 && (
                  <div className="text-center py-14">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">No jobs found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your search or filters
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setLocationFilter("");
                        setJobTypeFilter("all");
                      }}
                    >
                      Clear search
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ══ SAVED JOBS ══ */}
          <TabsContent value="saved">
            {savedJobsList.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No saved jobs yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tap the bookmark icon on any job to save it here
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("find")}>
                  Browse Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground px-1">
                  {savedJobsList.length} saved job{savedJobsList.length !== 1 ? 's' : ''}
                </p>
                {savedJobsList.map((job) => (
                  <Card key={job.id} className="border hover:border-primary/20 hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground mb-0.5 line-clamp-1">
                            {job.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">{job.company}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className={`text-xs ${getJobTypeBadgeColor(job.job_type)}`}>
                              {job.job_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mr-1" />
                              {job.location}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => toggleSaveJob(job.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => handleApplyJob(job)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ══ POST JOB ══ */}
          <TabsContent value="post">
            {!user ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Login Required</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You must be logged in to post job listings
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => window.location.href = '/auth'}
                >
                  Login to Post Jobs
                </Button>
              </div>
            ) : (
              <Card className="border-2">
                <CardHeader className="p-4 md:p-6 pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Post a New Job</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fill in the details below to list your legal job opening
                  </p>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <form onSubmit={handleSubmitJob} className="space-y-4">

                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Job Title *</label>
                        <Input
                          placeholder="e.g. Senior Corporate Lawyer"
                          value={jobForm.title}
                          onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Company / Firm *</label>
                        <Input
                          placeholder="Your law firm or company name"
                          value={jobForm.company}
                          onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Location *</label>
                        <Input
                          placeholder="City, State"
                          value={jobForm.location}
                          onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Job Type *</label>
                        <Select
                          value={jobForm.job_type}
                          onValueChange={(v) => setJobForm({ ...jobForm, job_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Experience Level</label>
                        <Select
                          value={jobForm.experience_level}
                          onValueChange={(v) => setJobForm({ ...jobForm, experience_level: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERIENCE_LEVELS.map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Salary Range</label>
                        <Input
                          placeholder="₦XXX,XXX - ₦XXX,XXX/month"
                          value={jobForm.salary_range}
                          onChange={(e) => setJobForm({ ...jobForm, salary_range: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Application Deadline</label>
                        <Input
                          type="date"
                          value={jobForm.deadline}
                          onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Job Description *</label>
                      <Textarea
                        rows={4}
                        placeholder="Describe the role, day-to-day responsibilities..."
                        value={jobForm.description}
                        onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                        required
                      />
                    </div>

                    {/* Requirements */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Requirements</label>
                      <Textarea
                        rows={3}
                        placeholder="e.g. Called to Bar, 5+ years experience, LLM preferred..."
                        value={jobForm.requirements}
                        onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                      />
                    </div>

                    {/* Benefits */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Benefits & Perks</label>
                      <Textarea
                        rows={2}
                        placeholder="e.g. Health insurance, remote work, professional development..."
                        value={jobForm.benefits}
                        onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-semibold"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                          Posting Job...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Post Job Listing
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}