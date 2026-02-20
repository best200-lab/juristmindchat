import { Clock, MessageCircle, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockHistory = [
  {
    id: "1",
    title: "Contract Review Discussion",
    preview: "Can you help me review this employment contract?",
    timestamp: "2 hours ago",
    type: "chat"
  },
  {
    id: "2", 
    title: "Legal Precedent Search",
    preview: "Searched for cases related to intellectual property disputes",
    timestamp: "1 day ago",
    type: "search"
  },
  {
    id: "3",
    title: "Corporate Law Consultation",
    preview: "What are the requirements for forming an LLC?",
    timestamp: "3 days ago", 
    type: "chat"
  },
  {
    id: "4",
    title: "Immigration Law Research",
    preview: "Searched for H1-B visa requirements and processes",
    timestamp: "1 week ago",
    type: "search"
  }
];

export default function History() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-surface">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Chat History</h1>
          <p className="text-muted-foreground">View and manage your previous conversations and searches</p>
        </div>

        <div className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your history..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Filter
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {mockHistory.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {item.type === "chat" ? (
                        <MessageCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Search className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2 truncate">{item.preview}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}