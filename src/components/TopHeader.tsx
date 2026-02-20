import { User, Settings, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { NotificationCenter } from "@/components/NotificationCenter";

export function TopHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="h-14 bg-[rgba(10,10,15,0.8)] backdrop-blur-2xl border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-5 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.05)] transition-all" />
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <NotificationCenter />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0.5 rounded-full hover:bg-transparent">
                  <Avatar className="w-8 h-8 ring-2 ring-primary/50 shadow-gold transition-all hover:ring-primary hover:shadow-gold-lg">
                    <AvatarFallback className="bg-secondary text-primary text-sm font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-[rgba(255,255,255,0.1)]">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="text-foreground hover:bg-[rgba(255,255,255,0.06)]">
                  <User className="w-4 h-4 mr-2 text-muted-foreground" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="text-foreground hover:bg-[rgba(255,255,255,0.06)]">
                  <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)]" />
                <DropdownMenuItem onClick={handleSignOut} className="text-foreground hover:bg-[rgba(255,255,255,0.06)]">
                  <LogOut className="w-4 h-4 mr-2 text-muted-foreground" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button onClick={() => navigate('/auth')} className="bg-gradient-primary text-gold-foreground hover:shadow-gold-lg btn-lift btn-press text-sm font-semibold">
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
