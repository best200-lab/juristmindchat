import { Star, MapPin, Mail, Phone, MessageSquare, CheckCircle2, Clock, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface LawyerCardProps {
  lawyer: {
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
  };
}

export function LawyerCard({ lawyer }: LawyerCardProps) {
  const navigate = useNavigate();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i < Math.floor(rating)
            ? 'fill-amber-400 text-amber-400'
            : 'text-muted-foreground/30'
        }`}
      />
    ));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500';
      case 'busy':
        return 'bg-amber-500';
      default:
        return 'bg-muted-foreground/40';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online':
        return 'Online Now';
      case 'busy':
        return 'Busy';
      default:
        return 'Offline';
    }
  };

  const accentColor = lawyer.brand_accent_color || 'hsl(var(--primary))';

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-border/50 bg-card"
      onClick={() => navigate(`/lawyers/${lawyer.slug || lawyer.id}`)}
    >
      {/* Accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: accentColor }}
      />
      
      <CardContent className="p-5">
        {/* Header with Avatar and Basic Info */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <Avatar className="w-16 h-16 ring-2 ring-border shadow-md">
              <AvatarImage src={lawyer.avatar_url} alt={lawyer.name} />
              <AvatarFallback 
                className="text-lg font-semibold"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                {getInitials(lawyer.name)}
              </AvatarFallback>
            </Avatar>
            {/* Status indicator */}
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(lawyer.availability_status)}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{lawyer.name}</h3>
              {lawyer.verification_status === 'verified' && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Verified</span>
                </div>
              )}
            </div>
            
            {lawyer.firm_name && (
              <p className="text-sm text-muted-foreground truncate mb-1">{lawyer.firm_name}</p>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Circle className={`w-2 h-2 fill-current ${getStatusColor(lawyer.availability_status).replace('bg-', 'text-')}`} />
              <span>{getStatusText(lawyer.availability_status)}</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">{renderStars(lawyer.rating)}</div>
          <span className="text-sm font-medium text-foreground">{lawyer.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({lawyer.total_ratings} reviews)</span>
        </div>

        {/* Description */}
        {lawyer.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {lawyer.description}
          </p>
        )}

        {/* Location & Experience */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{lawyer.city ? `${lawyer.city}, ${lawyer.state}` : lawyer.state}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{lawyer.years_experience} years</span>
          </div>
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {lawyer.specialization.slice(0, 3).map((spec, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-[10px] px-2 py-0.5 bg-muted/50"
            >
              {spec}
            </Badge>
          ))}
          {lawyer.specialization.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              +{lawyer.specialization.length - 3}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              if (lawyer.email) {
                window.location.href = `mailto:${lawyer.email}`;
              }
            }}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Message
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              if (lawyer.phone) {
                window.location.href = `tel:${lawyer.phone}`;
              } else {
                toast.error('No phone number available');
              }
            }}
          >
            <Phone className="w-3.5 h-3.5 mr-1.5" />
            Call
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
