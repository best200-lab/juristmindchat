import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send, Mic, Paperclip, Copy, Check, RotateCcw,
  ThumbsUp, ThumbsDown, Search, BookOpen, Scale,
  FileText, Cpu, CheckCircle2, Loader2, ChevronDown,
  ChevronUp, Gavel, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "react-router-dom";
import { SourceDisplay } from "@/components/SourceDisplay";
import ReactMarkdown from "react-markdown";
import TextareaAutosize from "react-textarea-autosize";
import remarkGfm from "remark-gfm";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ProcessStepStatus = "pending" | "running" | "done" | "error";

interface ProcessStep {
  id: string;
  label: string;
  detail?: string;
  status: ProcessStepStatus;
  durationMs?: number;
  startedAt?: number;
  icon: "search" | "cases" | "sections" | "analysis" | "writing" | "verify";
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  sources?: string[];
  db_id?: string;
  processSteps?: ProcessStep[];
  isStreaming?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Process Step Detection — parse streaming chunks for signals
// ─────────────────────────────────────────────────────────────

// Maps text signals from the backend stream to step metadata
const STEP_SIGNALS: Array<{
  pattern: RegExp;
  stepId: string;
  label: string;
  icon: ProcessStep["icon"];
  detail?: string;
}> = [
  {
    pattern: /PHASE 1|section.*search|searching.*section|verif.*section/i,
    stepId: "sections",
    label: "Searching statutory sections",
    icon: "sections",
  },
  {
    pattern: /PHASE 2|amendment.*verif|verif.*amendment/i,
    stepId: "amendments",
    label: "Verifying amendments",
    icon: "verify",
  },
  {
    pattern: /PHASE 3|landmark case|searching.*case|case.*search|searched cases/i,
    stepId: "landmark",
    label: "Searching landmark cases",
    icon: "cases",
  },
  {
    pattern: /PHASE 4|recent case|recent.*decision|2020.*2021.*2022/i,
    stepId: "recent",
    label: "Finding recent decisions",
    icon: "cases",
  },
  {
    pattern: /PHASE 5|legal principle|doctrine|trite law/i,
    stepId: "principles",
    label: "Analysing legal principles",
    icon: "analysis",
  },
  {
    pattern: /crunching|compiling|assembl|structur.*response|writing/i,
    stepId: "writing",
    label: "Structuring legal analysis",
    icon: "writing",
  },
];

function detectStepsFromChunk(chunk: string): string[] {
  const triggered: string[] = [];
  for (const signal of STEP_SIGNALS) {
    if (signal.pattern.test(chunk)) {
      triggered.push(signal.stepId);
    }
  }
  return triggered;
}

function getInitialSteps(intentHint?: string): ProcessStep[] {
  const isLegal = !intentHint || !["greeting", "simple_non_law"].includes(intentHint);
  if (!isLegal) return [];

  return [
    {
      id: "sections",
      label: "Searching statutory sections",
      icon: "sections",
      status: "pending",
    },
    {
      id: "amendments",
      label: "Verifying amendments",
      icon: "verify",
      status: "pending",
    },
    {
      id: "landmark",
      label: "Searching landmark cases",
      icon: "cases",
      status: "pending",
    },
    {
      id: "recent",
      label: "Finding recent decisions",
      icon: "cases",
      status: "pending",
    },
    {
      id: "writing",
      label: "Structuring legal analysis",
      icon: "writing",
      status: "pending",
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const stepIconMap: Record<ProcessStep["icon"], React.ReactNode> = {
  search: <Search className="w-3.5 h-3.5" />,
  cases: <Gavel className="w-3.5 h-3.5" />,
  sections: <BookOpen className="w-3.5 h-3.5" />,
  analysis: <Scale className="w-3.5 h-3.5" />,
  writing: <FileText className="w-3.5 h-3.5" />,
  verify: <CheckCircle2 className="w-3.5 h-3.5" />,
};

function StepRow({ step }: { step: ProcessStep }) {
  return (
    <div className="flex items-center gap-2.5 py-1 group">
      {/* Status indicator */}
      <div className="shrink-0 w-5 h-5 flex items-center justify-center">
        {step.status === "done" ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
        ) : step.status === "running" ? (
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          </div>
        ) : step.status === "error" ? (
          <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center">
            <span className="text-red-500 text-[10px] font-bold">!</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Icon */}
      <span
        className={`shrink-0 transition-colors ${
          step.status === "done"
            ? "text-emerald-500"
            : step.status === "running"
            ? "text-primary"
            : "text-muted-foreground/40"
        }`}
      >
        {stepIconMap[step.icon]}
      </span>

      {/* Label */}
      <span
        className={`text-xs font-medium transition-colors leading-none ${
          step.status === "done"
            ? "text-foreground/80"
            : step.status === "running"
            ? "text-foreground"
            : "text-muted-foreground/50"
        }`}
      >
        {step.label}
        {step.detail && (
          <span className="ml-1 font-normal text-muted-foreground">
            — {step.detail}
          </span>
        )}
      </span>

      {/* Duration */}
      {step.status === "done" && step.durationMs !== undefined && (
        <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono shrink-0 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {(step.durationMs / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}

function ProcessPanel({
  steps,
  isStreaming,
  isComplete,
}: {
  steps: ProcessStep[];
  isStreaming: boolean;
  isComplete: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const hasAnyActive = steps.some(
    (s) => s.status === "running" || s.status === "done"
  );

  // Auto-collapse when done
  useEffect(() => {
    if (isComplete && doneCount > 0) {
      const t = setTimeout(() => setCollapsed(true), 2000);
      return () => clearTimeout(t);
    }
  }, [isComplete, doneCount]);

  if (!hasAnyActive && !isStreaming) return null;

  return (
    <div className="mb-3 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            {isComplete ? "Analysis Complete" : "Working…"}
          </span>
          {!isComplete && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
          {isComplete && (
            <span className="text-[10px] text-emerald-500 font-medium">
              {doneCount} steps
            </span>
          )}
        </div>
        <span className="text-muted-foreground/60">
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Steps */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-1 space-y-0.5 border-t border-border/40">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}

// Blinking cursor for streaming text
function StreamingCursor() {
  return (
    <span className="inline-block w-[2px] h-[14px] bg-foreground/70 ml-0.5 align-middle animate-pulse" />
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user) return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session");
    if (sessionId) loadSession(sessionId);
    else loadMostRecentSession();
  }, [user]);

  useEffect(() => {
    const handler = () => {
      setMessages([]);
      setCurrentSessionId(null);
    };
    window.addEventListener("newChat", handler);
    return () => window.removeEventListener("newChat", handler);
  }, []);

  useEffect(() => {
    if (!currentSessionId) return;
    const channel = supabase
      .channel(`chat_updates:${currentSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${currentSessionId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.db_id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                db_id: newMsg.id,
                content: newMsg.content,
                sender: newMsg.sender as "user" | "ai",
                timestamp: new Date(newMsg.created_at),
              },
            ];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentSessionId]);

  // ── Helpers ────────────────────────────────────────────────

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast({ description: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (message: Message, isPositive: boolean) => {
    if (!message.db_id || !user) {
      toast({ description: "Cannot rate this message yet.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("chat_feedback").insert({
        message_id: message.db_id,
        user_id: user.id,
        is_positive: isPositive,
      });
      if (error) throw error;
      toast({
        title: isPositive ? "Thanks!" : "Feedback Sent",
        description: "We use this to improve JuristMind.",
      });
    } catch {
      toast({ description: "Failed to submit feedback", variant: "destructive" });
    }
  };

  const handleRegenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.sender === "user");
    if (lastUser && !isLoading) {
      if (messages[messages.length - 1].sender === "ai") {
        setMessages((prev) => prev.slice(0, -1));
      }
      await processMessage(lastUser.content, true);
    }
  };

  const loadMostRecentSession = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) await loadSession(data.id);
    } catch (e) { console.error(e); }
  };

  const createNewSession = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title: "New Chat" })
        .select()
        .single();
      if (error) throw error;
      return data.id;
    } catch { return null; }
  };

  const saveMessage = async (
    sessionId: string,
    content: string,
    sender: "user" | "ai"
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, content, sender })
        .select("id, created_at")
        .single();
      if (error) throw error;
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
      return data?.id || null;
    } catch { return null; }
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title =
      firstMessage.length > 50
        ? firstMessage.substring(0, 50) + "…"
        : firstMessage;
    try {
      await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId);
    } catch (e) { console.error(e); }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, content, sender, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        setMessages([]);
        setCurrentSessionId(sessionId);
        return;
      }
      setMessages(
        data.map((msg) => ({
          id: msg.id,
          db_id: msg.id,
          content: msg.content,
          sender: msg.sender as "user" | "ai",
          timestamp: new Date(msg.created_at),
          sources: [],
        }))
      );
      setCurrentSessionId(sessionId);
    } catch {
      toast({ title: "Error", description: "Failed to load chat session", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Core message processor ─────────────────────────────────

  const processMessage = async (
    messageContent: string,
    isRegeneration = false
  ) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in.", variant: "destructive" });
      return;
    }

    // Usage check
    try {
      const { data: usageCheck, error: usageError } = await supabase.rpc("check_and_increment_usage");
      if (usageError) throw usageError;
      if (usageCheck?.allowed === false) {
        toast({
          title: "Limit Reached",
          description: "Please upgrade your plan to continue.",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/upgrade")}>
              Upgrade
            </Button>
          ),
        });
        return;
      }
      if (usageCheck?.limit && usageCheck.limit - usageCheck.requests_used <= 2) {
        toast({
          title: "Usage Notice",
          description: `You have ${usageCheck.limit - usageCheck.requests_used} requests remaining today.`,
        });
      }
    } catch (e) { console.error("Usage check:", e); return; }

    // Session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast({ title: "Error", description: "Failed to create chat session", variant: "destructive" });
        return;
      }
      setCurrentSessionId(sessionId);
    }

    // Add user message to UI
    if (!isRegeneration) {
      setInputValue("");
      const tempId = Date.now().toString();
      const newMsg: Message = {
        id: tempId,
        content: messageContent,
        sender: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMsg]);
      const userDbId = await saveMessage(sessionId, messageContent, "user");
      if (userDbId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, db_id: userDbId } : m))
        );
      }
      if (messages.length === 0) await updateSessionTitle(sessionId, messageContent);
    }

    setIsLoading(true);

    // Create AI placeholder with process steps
    const aiTempId = (Date.now() + 1).toString();
    const initialSteps = getInitialSteps();
    const aiPlaceholder: Message = {
      id: aiTempId,
      content: "",
      sender: "ai",
      timestamp: new Date(),
      processSteps: initialSteps,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    // Track which steps have been started
    const stepStartTimes: Record<string, number> = {};
    const activatedSteps = new Set<string>();

    // Helper: activate a step by id
    const activateStep = (stepId: string) => {
      if (activatedSteps.has(stepId)) return;
      activatedSteps.add(stepId);
      const now = Date.now();
      stepStartTimes[stepId] = now;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== aiTempId || !m.processSteps) return m;
          return {
            ...m,
            processSteps: m.processSteps.map((s) =>
              s.id === stepId ? { ...s, status: "running", startedAt: now } : s
            ),
          };
        })
      );
    };

    // Helper: complete a step
    const completeStep = (stepId: string, detail?: string) => {
      const startTime = stepStartTimes[stepId] || Date.now();
      const durationMs = Date.now() - startTime;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== aiTempId || !m.processSteps) return m;
          return {
            ...m,
            processSteps: m.processSteps.map((s) =>
              s.id === stepId
                ? { ...s, status: "done", durationMs, detail }
                : s
            ),
          };
        })
      );
    };

    // Kick off first step immediately
    activateStep("sections");
    let currentStepIndex = 0;
    const stepOrder = ["sections", "amendments", "landmark", "recent", "writing"];

    // Progressive step advancement timer (simulate progress while streaming)
    let stepInterval: ReturnType<typeof setInterval> | null = null;
    let charCount = 0;

    try {
      const formData = new FormData();
      formData.append("question", messageContent);
      if (sessionId) formData.append("chat_id", sessionId);
      if (user?.id) formData.append("user_id", user.id);

      const response = await fetch("https://juristmind.onrender.com/ask", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to get AI response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let done = false;
      let responseStarted = false;

      // Progressive step advancement: as chunks arrive, advance steps
      // so the UI stays alive and informative the whole time
      stepInterval = setInterval(() => {
        if (currentStepIndex < stepOrder.length - 1 && fullContent.length > charCount) {
          charCount = fullContent.length;
          // Move to next step if we have accumulated enough content
          const thresholds = [0, 200, 600, 1200, 2000];
          const nextIdx = thresholds.findIndex((t, i) =>
            i > currentStepIndex && fullContent.length >= t
          );
          if (nextIdx !== -1 && nextIdx > currentStepIndex) {
            completeStep(stepOrder[currentStepIndex]);
            currentStepIndex = nextIdx;
            if (currentStepIndex < stepOrder.length) {
              activateStep(stepOrder[currentStepIndex]);
            }
          }
        }
      }, 400);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const dataStr = line.slice(5).trim();
            if (dataStr === "[DONE]") { done = true; break; }

            try {
              const data = JSON.parse(dataStr);

              // Heartbeat — keep UI alive
              if (data.type === "heartbeat") continue;

              // Done signal
              if (data.type === "done") {
                done = true;
                break;
              }

              // Content chunk
              if (data.content) {
                if (!responseStarted) {
                  responseStarted = true;
                  // Move to writing step when first content arrives
                  if (currentStepIndex < stepOrder.length - 1) {
                    completeStep(stepOrder[currentStepIndex]);
                    currentStepIndex = stepOrder.length - 1;
                    activateStep("writing");
                  }
                }

                // Detect process signals in the chunk text
                const triggered = detectStepsFromChunk(data.content);
                for (const stepId of triggered) {
                  if (!activatedSteps.has(stepId)) {
                    activateStep(stepId);
                  }
                }

                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiTempId ? { ...m, content: fullContent } : m
                  )
                );
              }
            } catch { /* skip parse errors */ }
          }
        }
      }

      // Cleanup interval
      if (stepInterval) clearInterval(stepInterval);

      // Complete all remaining steps
      for (const stepId of stepOrder) {
        if (!activatedSteps.has(stepId)) {
          activateStep(stepId);
        }
        completeStep(stepId);
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiTempId ? { ...m, isStreaming: false } : m
        )
      );

      // Fallback if no content
      if (!fullContent) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          fullContent = data.answer || data.content || "I'm JuristMind, your legal AI assistant.";
          setMessages((prev) =>
            prev.map((m) => (m.id === aiTempId ? { ...m, content: fullContent } : m))
          );
        } catch {
          fullContent = "Response received but could not be parsed.";
        }
      }

      // Persist
      if (fullContent) {
        const aiDbId = await saveMessage(sessionId, fullContent, "ai");
        if (aiDbId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiTempId ? { ...m, db_id: aiDbId } : m))
          );
        }
      }
    } catch (error) {
      if (stepInterval) clearInterval(stepInterval);
      console.error("AI error:", error);
      const errContent = "I'm having trouble connecting right now. Please try again.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiTempId
            ? { ...m, content: errContent, isStreaming: false, processSteps: m.processSteps?.map(s => ({ ...s, status: s.status === "running" ? "error" as const : s.status })) }
            : m
        )
      );
      await saveMessage(sessionId, errContent, "ai");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    await processMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (!e.shiftKey && !isMobile) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-background">
      <div className="flex flex-col flex-1 h-full w-full">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-primary" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              JURIST MIND
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto w-full scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 pt-6 pb-4 w-full">

            {/* Empty state */}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <Scale className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  JURIST MIND
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
                  {user
                    ? "Ask any question about Nigerian law. I'll search cases, verify statutes, and give you a precise legal answer."
                    : "Please sign in to start chatting"}
                </p>
                {!user && (
                  <Button
                    onClick={() => (window.location.href = "/auth")}
                    className="bg-foreground text-background hover:bg-foreground/90"
                  >
                    Sign In to Continue
                  </Button>
                )}

                {/* Suggestion chips */}
                {user && (
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {[
                      "Explain the doctrine of privity of contract",
                      "What is the position of law on bail in Nigeria?",
                      "Advise on a breach of contract scenario",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInputValue(suggestion);
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {/* AI avatar dot */}
                    {message.sender === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1 mr-2.5">
                        <Scale className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${
                        message.sender === "user"
                          ? "max-w-[80%] md:max-w-xl items-end"
                          : "max-w-[92%] md:max-w-2xl items-start w-full"
                      }`}
                    >
                      {/* Process panel — only for AI messages */}
                      {message.sender === "ai" && message.processSteps && (
                        <ProcessPanel
                          steps={message.processSteps}
                          isStreaming={message.isStreaming ?? false}
                          isComplete={!message.isStreaming}
                        />
                      )}

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 w-full ${
                          message.sender === "user"
                            ? "bg-foreground text-background rounded-tr-sm"
                            : "bg-transparent border border-border/70 rounded-tl-sm"
                        }`}
                      >
                        {/* Content */}
                        {message.content ? (
                          <div
                            className={`text-sm leading-relaxed break-words ${
                              message.sender === "user" ? "text-background" : "text-foreground"
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => (
                                  <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />
                                ),
                                strong: ({ node, ...props }) => (
                                  <span className="font-semibold" {...props} />
                                ),
                                em: ({ node, ...props }) => (
                                  <em className="italic text-muted-foreground" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                  <ul className="list-disc pl-5 mb-2.5 space-y-1" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                  <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                  <li className="pl-0.5 leading-relaxed" {...props} />
                                ),
                                h1: ({ node, ...props }) => (
                                  <h1 className="text-base font-bold mt-5 mb-2 border-b border-border/40 pb-1.5" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 className="text-sm font-bold mt-4 mb-1.5 text-foreground" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 className="text-sm font-semibold mt-3 mb-1 text-foreground/90" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                  <blockquote
                                    className="border-l-2 border-primary/40 pl-3 my-3 italic text-muted-foreground"
                                    {...props}
                                  />
                                ),
                                code: ({ node, className, ...props }) => (
                                  <code
                                    className={`bg-muted/60 px-1.5 py-0.5 rounded text-xs font-mono ${className}`}
                                    {...props}
                                  />
                                ),
                                pre: ({ node, ...props }) => (
                                  <div className="overflow-x-auto w-full my-3 bg-muted/50 border border-border/50 p-3 rounded-lg">
                                    <pre className="text-xs" {...props} />
                                  </div>
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-4 border border-border/60 rounded-lg shadow-sm">
                                    <table
                                      className="min-w-full divide-y divide-border bg-card text-card-foreground"
                                      {...props}
                                    />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead className="bg-muted/40" {...props} />
                                ),
                                tbody: ({ node, ...props }) => (
                                  <tbody className="divide-y divide-border/50 bg-background" {...props} />
                                ),
                                tr: ({ node, ...props }) => (
                                  <tr className="hover:bg-muted/30 transition-colors" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th
                                    className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                                    {...props}
                                  />
                                ),
                                td: ({ node, ...props }) => (
                                  <td className="px-4 py-2.5 text-sm" {...props} />
                                ),
                                hr: ({ node, ...props }) => (
                                  <hr className="my-4 border-border/40" {...props} />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                            {message.isStreaming && <StreamingCursor />}
                          </div>
                        ) : (
                          /* Empty state while waiting for first chunk */
                          <div className="flex items-center gap-2 py-1">
                            <div className="flex gap-1">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                                  style={{ animationDelay: `${i * 0.2}s` }}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground/60 animate-pulse">
                              Retrieving legal information…
                            </span>
                          </div>
                        )}
                      </div>

                      {/* AI message actions */}
                      {message.sender === "ai" && message.content && !message.isStreaming && (
                        <div className="flex items-center gap-1 mt-1.5 px-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => handleCopy(message.content, message.id)}
                            title="Copy"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {index === messages.length - 1 && !isLoading && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              onClick={handleRegenerate}
                              title="Regenerate"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <div className="flex-1" />

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => handleFeedback(message, true)}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleFeedback(message, false)}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Timestamp for user messages */}
                      {message.sender === "user" && (
                        <p className="text-[10px] text-muted-foreground/50 mt-1 pr-1">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}

                      {/* Sources */}
                      {message.sender === "ai" &&
                        message.sources &&
                        message.sources.length > 0 && (
                          <SourceDisplay sources={message.sources} />
                        )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 pb-5 pt-3 bg-background border-t border-border/50">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex gap-2 items-end bg-card border border-border/70 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-all shadow-sm">
              <Button
                size="sm"
                variant="ghost"
                className="p-1.5 h-9 w-9 rounded-xl hidden md:flex shrink-0 mb-0.5 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <div className="flex-1 relative min-h-[44px] flex items-center">
                <TextareaAutosize
                  minRows={1}
                  maxRows={6}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a legal question…"
                  disabled={isLoading || !user}
                  className="w-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm py-2.5 pr-20 text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
                />

                <div className="absolute right-0 bottom-0 flex gap-1 pb-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1.5 h-8 w-8 rounded-xl hidden sm:flex text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading || !user}
                    size="sm"
                    className="p-0 h-8 w-8 rounded-xl bg-foreground text-background hover:bg-foreground/85 shrink-0 disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground/50 mt-2.5">
              By using JuristMind, you consent to the{" "}
              <NavLink to="/terms" className="text-primary/70 hover:text-primary hover:underline">
                terms and conditions
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
