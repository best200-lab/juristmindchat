import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Star, MapPin, Mail, Phone, MessageSquare, CheckCircle2, 
  Globe, Linkedin, Clock, Briefcase, Award, Eye, Play, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lawyer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state: string;
  city?: string;
  street?: string;
  postal_code?: string;
  country?: string;
  firm_name?: string;
  firm_logo_url?: string;
  avatar_url?: string;
  brand_accent_color?: string;
  bio_structured?: {
    about?: string;
    approach?: string;
    case_studies?: Array<{
      title: string;
      outcome: string;
      category: string;
    }>;
  };
  description?: string;
  specialization: string[];
  years_experience: number;
  bar_number?: string;
  rating: number;
  total_ratings: number;
  verification_status?: string;
  availability_status?: string;
  slug?: string;
  profile_views?: number;
  intro_video_url?: string;
  website?: string;
  social_media?: string;
}

export default function LawyerProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchLawyer();
      incrementViews();
    }
  }, [slug]);

  const fetchLawyer = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('search-lawyers', {
        body: { action: 'get-by-slug', slug }
      });

      if (error) throw error;
      setLawyer(data);
    } catch (error) {
      console.error('Error fetching lawyer:', error);
      toast.error('Failed to load lawyer profile');
    } finally {
      setLoading(false);
    }
  };

  const incrementViews = async () => {
    try {
      await supabase.rpc('increment_lawyer_views', { lawyer_slug: slug });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'text-muted-foreground/30'
        }`}
      />
    ));
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Online Now
          </Badge>
        );
      case 'busy':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
            Busy
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/50 mr-1.5" />
            Offline
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-background overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lawyer not found</h2>
          <p className="text-muted-foreground mb-4">The profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/lawyers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const accentColor = lawyer.brand_accent_color || 'hsl(var(--primary))';
  const bioData = lawyer.bio_structured || { about: lawyer.description, approach: '', case_studies: [] };

  return (
    <div className="h-full bg-background overflow-y-auto">
      {/* Hero Header */}
      <div 
        className="relative h-32 md:h-40"
        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
      >
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Profile Header */}
        <div className="relative -mt-16 md:-mt-20 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-28 h-28 md:w-32 md:h-32 ring-4 ring-background shadow-xl">
                <AvatarImage src={lawyer.avatar_url} alt={lawyer.name} />
                <AvatarFallback 
                  className="text-3xl font-bold"
                  style={{ backgroundColor: accentColor, color: 'white' }}
                >
                  {getInitials(lawyer.name)}
                </AvatarFallback>
              </Avatar>
              {lawyer.verification_status === 'verified' && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-4 md:pt-8">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{lawyer.name}</h1>
                {getStatusBadge(lawyer.availability_status)}
              </div>

              {lawyer.firm_name && (
                <div className="flex items-center gap-2 mb-3">
                  {lawyer.firm_logo_url && (
                    <img src={lawyer.firm_logo_url} alt={lawyer.firm_name} className="h-6 w-auto" />
                  )}
                  <span className="text-muted-foreground">{lawyer.firm_name}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{lawyer.city ? `${lawyer.city}, ${lawyer.state}` : lawyer.state}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  <span>{lawyer.years_experience} years</span>
                </div>
                {lawyer.profile_views && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{lawyer.profile_views} views</span>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">{renderStars(lawyer.rating)}</div>
                <span className="font-semibold">{lawyer.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({lawyer.total_ratings} reviews)</span>
              </div>

              {/* Verification Badge */}
              {lawyer.verification_status === 'verified' && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">JuristMind Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button 
            size="lg" 
            className="flex-1 md:flex-none"
            style={{ backgroundColor: accentColor }}
            onClick={() => lawyer.email && (window.location.href = `mailto:${lawyer.email}`)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1 md:flex-none"
            onClick={() => lawyer.phone && (window.location.href = `tel:${lawyer.phone}`)}
          >
            <Phone className="w-4 h-4 mr-2" />
            Call
          </Button>
          {lawyer.intro_video_url && (
            <Button variant="outline" size="lg" className="flex-1 md:flex-none">
              <Play className="w-4 h-4 mr-2" />
              Watch 60s Intro
            </Button>
          )}
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-2 mb-8">
          {lawyer.specialization.map((spec, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="px-3 py-1"
            >
              {spec}
            </Badge>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="about" className="mb-8">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="approach">Approach</TabsTrigger>
            <TabsTrigger value="case-studies">Case Studies</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground leading-relaxed">
                  {bioData.about || lawyer.description || 'No bio available.'}
                </p>
                
                {lawyer.bar_number && (
                  <div className="flex items-center gap-2 mt-6 pt-6 border-t">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Bar Number: {lawyer.bar_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approach" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground leading-relaxed">
                  {bioData.approach || 'No approach information available.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="case-studies" className="mt-6">
            <div className="grid gap-4">
              {bioData.case_studies && bioData.case_studies.length > 0 ? (
                bioData.case_studies.map((study, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{study.title}</CardTitle>
                        <Badge variant="secondary">{study.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{study.outcome}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No case studies available yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lawyer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${lawyer.email}`} className="text-primary hover:underline">
                  {lawyer.email}
                </a>
              </div>
            )}
            {lawyer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${lawyer.phone}`} className="text-primary hover:underline">
                  {lawyer.phone}
                </a>
              </div>
            )}
            {lawyer.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <a 
                  href={lawyer.website.startsWith('http') ? lawyer.website : `https://${lawyer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {lawyer.website}
                </a>
              </div>
            )}
            {lawyer.social_media && (
              <div className="flex items-center gap-3">
                <Linkedin className="w-5 h-5 text-muted-foreground" />
                <a 
                  href={lawyer.social_media.startsWith('http') ? lawyer.social_media : `https://${lawyer.social_media}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Social Profile
                </a>
              </div>
            )}
            {(lawyer.street || lawyer.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="text-muted-foreground">
                  {lawyer.street && <p>{lawyer.street}</p>}
                  <p>{lawyer.city && `${lawyer.city}, `}{lawyer.state}</p>
                  {lawyer.postal_code && <p>{lawyer.postal_code}</p>}
                  {lawyer.country && <p>{lawyer.country}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-8"
          onClick={() => navigate('/lawyers')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Directory
        </Button>
      </div>
    </div>
  );
}
