
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { JuristSidebar } from "@/components/JuristSidebar";
import { TopHeader } from "@/components/TopHeader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Cases from "./pages/Cases";
import Diary from "./pages/Diary";
import Jobs from "./pages/Jobs";
import Marketplace from "./pages/Marketplace";
import LawyersDirectory from "./pages/LawyersDirectory";
import { LawyerProfilePage } from "@/components/lawyers";
import JudgeNotes from "./pages/JudgeNotes";
import JTL from "./pages/JTL";
import History from "./pages/History";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Unauthenticated routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* All other routes are protected with sidebar */}
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex h-screen w-full bg-background">
                    <JuristSidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <TopHeader />
                      <main className="flex-1 overflow-hidden">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/chat/:sessionId" element={<Index />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/cases" element={<Cases />} />
                          <Route path="/diary" element={<Diary />} />
                          <Route path="/jobs" element={<Jobs />} />
                          <Route path="/marketplace" element={<Marketplace />} />
                          <Route path="/lawyers" element={<LawyersDirectory />} />
                          <Route path="/lawyers/:slug" element={<LawyerProfilePage />} />
                          <Route path="/judge-notes" element={<JudgeNotes />} />
                          <Route path="/jtl" element={<JTL />} />
                          <Route path="/history" element={<History />} />
                          <Route path="/upgrade" element={<Upgrade />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
