import { useState, useEffect } from "react";
import { Search, Filter, MapPin, Users, Sparkles, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LawyerCard, RegisterLawyerDialog } from "@/components/lawyers";

interface Lawyer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state: string;
  city?: string;
  firm_name?: string;
  firm_logo_url?: string;
  avatar_url?: string;
  brand_accent_color?: string;
  description?: string;
  specialization: string[];
  years_experience: number;
  rating: number;
  total_ratings: number;
  verification_status?: string;
  availability_status?: string;
  slug?: string;
  profile_views?: number;
}

export default function LawyersDirectory() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<Lawyer[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLawyers();
    fetchStates();
    fetchSpecializations();
  }, []);

  const fetchLawyers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('search-lawyers', {
        body: { action: 'get-all' }
      });

      if (error) throw error;
      setLawyers(data || []);
      setFilteredLawyers(data || []);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
      toast.error('Failed to fetch lawyers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('search-lawyers', {
        body: { action: 'get-states' }
      });

      if (error) throw error;
      setStates(data || []);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  const fetchSpecializations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('search-lawyers', {
        body: { action: 'get-specializations' }
      });

      if (error) throw error;
      setSpecializations(data || []);
    } catch (error) {
      console.error('Error fetching specializations:', error);
    }
  };

  useEffect(() => {
    let filtered = lawyers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lawyer => 
        lawyer.name.toLowerCase().includes(term) ||
        lawyer.firm_name?.toLowerCase().includes(term) ||
        lawyer.specialization.some(spec => spec.toLowerCase().includes(term))
      );
    }

    if (selectedState && selectedState !== "all") {
      filtered = filtered.filter(lawyer => lawyer.state === selectedState);
    }

    if (selectedSpecialization && selectedSpecialization !== "all") {
      filtered = filtered.filter(lawyer => 
        lawyer.specialization.includes(selectedSpecialization)
      );
    }

    setFilteredLawyers(filtered);
  }, [searchTerm, selectedState, selectedSpecialization, lawyers]);

  const onlineLawyers = filteredLawyers.filter(l => l.availability_status === 'online').length;
  const topRated = filteredLawyers.filter(l => l.rating >= 4.5).length;

  if (loading) {
    return (
      <div className="h-full bg-background overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-10 w-80 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Header */}
        <div className="relative mb-8 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Trusted Legal Professionals
              </Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Connect with a Lawyer
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Discover verified legal professionals across Nigeria. Build lasting professional relationships with trusted lawyers.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{onlineLawyers} Online</p>
                  <p className="text-xs text-muted-foreground">Available now</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{topRated} Top Rated</p>
                  <p className="text-xs text-muted-foreground">4.5+ stars</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{states.length} States</p>
                  <p className="text-xs text-muted-foreground">Nationwide coverage</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name, firm, or practice area..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>

            {/* Filter Toggle & Register */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-12 px-4"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {(selectedState !== 'all' || selectedSpecialization !== 'all') && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {(selectedState !== 'all' ? 1 : 0) + (selectedSpecialization !== 'all' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
              <RegisterLawyerDialog onLawyerAdded={fetchLawyers} />
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-4 mt-4 p-4 bg-muted/30 rounded-xl border animate-in slide-in-from-top-2">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-48 h-10">
                  <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                <SelectTrigger className="w-56 h-10">
                  <SelectValue placeholder="All Specializations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  {specializations.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(selectedState !== 'all' || selectedSpecialization !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedState('all');
                    setSelectedSpecialization('all');
                  }}
                  className="text-muted-foreground"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredLawyers.length}</span> lawyers found
          </p>
        </div>

        {/* Lawyers Grid */}
        {filteredLawyers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No lawyers found
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We couldn't find any lawyers matching your criteria. Try adjusting your filters or search term.
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedState('all');
                setSelectedSpecialization('all');
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
