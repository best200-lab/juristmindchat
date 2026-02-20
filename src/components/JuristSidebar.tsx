import { useState } from "react";
import { Search, MessageCircle, Scale, History, User, ShoppingBag, Briefcase, FileText, BookOpen, FolderOpen, Crown, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChatHistory } from "@/components/ChatHistory";

const navigationItems = [
  { title: "Search", url: "/search", icon: Search },
  { title: "Chat", url: "/", icon: MessageCircle },
  { title: "JTL", url: "/jtl", icon: Scale },
  { title: "Marketplace", url: "/marketplace", icon: ShoppingBag },
  { title: "Find/Post Jobs", url: "/jobs", icon: Briefcase },
  { title: "Latest Cases Report", url: "/judge-notes", icon: FileText },
  { title: "Diary", url: "/diary", icon: BookOpen },
  { title: "Cases", url: "/cases", icon: FolderOpen },
  { title: "Connect with Lawyers", url: "/lawyers", icon: User },
];

export function JuristSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [showChatHistory, setShowChatHistory] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/" || currentPath.startsWith("/chat");
    return currentPath.startsWith(path);
  };

  const handleNewChat = () => {
    navigate('/', { replace: true });
    window.dispatchEvent(new CustomEvent('newChat'));
  };

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300`}>
      <SidebarContent className="sidebar-premium sidebar-border-glow flex flex-col h-full">
        {/* Logo */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
  <img 
    src="https://asmostaidymrcesixebq.supabase.co/storage/v1/object/public/asset/juristlogo.png" 
    alt="Jurist Mind Logo" 
    className="w-8 h-8 object-contain" 
  />
</div>
            {!collapsed && (
              <div>
                <h1 className="text-base font-semibold text-foreground tracking-tight">JURIST</h1>
                <p className="text-xs font-light text-muted-foreground tracking-[0.15em]">MIND</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          )}
        </div>

        {/* New Chat */}
        <div className="px-3 py-3">
          <Button
            onClick={handleNewChat}
            className={`w-full justify-start gap-3 rounded-xl border border-primary/40 bg-secondary hover:bg-secondary/80 hover:border-primary hover:shadow-gold text-foreground btn-lift btn-press ${
              collapsed ? "px-2 justify-center" : "px-4"
            }`}
            size={collapsed ? "icon" : "default"}
            variant="ghost"
          >
            <Plus className="w-4 h-4 text-primary flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">New Chat</span>}
          </Button>
        </div>

        {/* Navigation */}
        <SidebarGroup className="px-2 py-2 flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="nav-stagger space-y-0.5">
              {navigationItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title} className="animate-fade-in-up">
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => handleNavigation(item.url)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-200 w-full text-left relative ${
                          active
                            ? "bg-[rgba(201,168,76,0.08)] text-foreground shadow-[inset_0_0_20px_rgba(201,168,76,0.05)]"
                            : "text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] hover:text-accent-foreground"
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                        )}
                        <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${active ? "text-primary" : ""}`} />
                        {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-4 h-px bg-[rgba(255,255,255,0.05)]" />

        {/* Chat History */}
        {!collapsed && (
          <SidebarGroup className="px-2 py-2">
            <SidebarGroupLabel className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium px-2">
              <span>History</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              >
                <History className="w-3.5 h-3.5" />
              </Button>
            </SidebarGroupLabel>
            {showChatHistory && (
              <SidebarGroupContent>
                <ChatHistory onNewChat={handleNewChat} compact={true} />
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        )}

        {/* Upgrade */}
        {!collapsed && (
          <div className="mt-auto p-3">
            <div className="glass rounded-xl p-3">
              <button
                onClick={() => handleNavigation('/upgrade')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-primary text-gold-foreground text-sm font-semibold btn-lift btn-press hover:shadow-gold-lg transition-all"
              >
                <Crown className="w-4 h-4" />
                Upgrade
              </button>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
