import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic, Paperclip, Plus, ArrowDown, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { SourceDisplay } from "@/components/SourceDisplay";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";

const JURIST_LOGO = "https://phmywmbqvaforkjohoza.supabase.co/storage/v1/object/public/avatars/Jurist%20Mind%20Ai%20Logo.png";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  sources?: string[];
  db_id?: string;
}

const quickPrompts = [
  "Summarise a case",
  "Explain a law",
  "Draft a legal letter",
  "Find recent judgements",
];

// ── Typing / loading indicator ──────────────────────────────────────────────
function TypingIndicator() {
  const [phase, setPhase] = useState<"dots" | "deep" | "almost">("dots");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 40) setPhase("almost");
        else if (next >= 20) setPhase("deep");
        else setPhase("dots");
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (phase === "deep") {
    return (
      <p className="text-sm text-primary/80 italic animate-pulse">
        Thinking deep to get accurate answers…
      </p>
    );
  }
  if (phase === "almost") {
    return (
      <p className="text-sm text-primary/80 italic animate-pulse">
        Almost ready…
      </p>
    );
  }
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <span className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
      <span className="w-2 h-2 rounded-full bg-primary/60 typing-dot" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNewChatRef = useRef(false); // ← FIX: prevents loadMostRecentSession after new chat

  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ── Scroll tracking ────────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom <= 150) {
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
    } else {
      shouldAutoScrollRef.current = false;
      if (messages.length > 0) setShowJumpToLatest(true);
    }
  }, [messages.length]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleJumpToLatest = () => {
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Session loading on URL change ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    if (urlSessionId) {
      isNewChatRef.current = false;
      setMessages([]);
      loadSession(urlSessionId);
    } else {
      // Only load most recent if this wasn't triggered by a "New Chat" click
      if (!isNewChatRef.current) {
        loadMostRecentSession();
      }
    }
  }, [user, urlSessionId]);

  // ── New chat event listener ────────────────────────────────────────────────
  useEffect(() => {
    const handleNewChatEvent = () => {
      setMessages([]);
      setCurrentSessionId(null);
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener("newChat", handleNewChatEvent);
    return () => window.removeEventListener("newChat", handleNewChatEvent);
  }, []);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSessionId) return;
    const channel = supabase
      .channel(`chat_updates:${currentSessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${currentSessionId}` },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((msg) => msg.db_id === newMsg.id)) return prev;
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

  // ── DB helpers ─────────────────────────────────────────────────────────────
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
      if (data) navigate(`/chat/${data.id}`, { replace: true });
    } catch (error) {
      console.error("Error loading recent session:", error);
    }
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
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  };

  const saveMessage = async (sessionId: string, content: string, sender: "user" | "ai"): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, content, sender })
        .select("id, created_at")
        .single();
      if (error) throw error;
      await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      return data?.id || null;
    } catch (error) {
      console.error("Error saving message:", error);
      toast({ title: "Warning", description: "Message may not have been saved", variant: "destructive" });
      return null;
    }
  };

  const updateSessionTitle = async (sessionId: string, firstMessage: string) => {
    const title = firstMessage.length > 50 ? firstMessage.substring(0, 50) + "..." : firstMessage;
    try {
      await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session title:", error);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    isNewChatRef.current = true; // ← prevent loadMostRecentSession in useEffect
    setMessages([]);
    setCurrentSessionId(null);
    shouldAutoScrollRef.current = true;
    setShowJumpToLatest(false);
    navigate("/", { replace: true });
    window.dispatchEvent(new CustomEvent("newChat"));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

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
      toast({ title: isPositive ? "Thanks!" : "Feedback Sent", description: "We use this to improve Jurist Mind." });
    } catch (error) {
      console.error("Feedback error:", error);
      toast({ description: "Failed to submit feedback", variant: "destructive" });
    }
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === "user");
    if (!lastUserMessage || isLoading) return;
    if (messages[messages.length - 1].sender === "ai") {
      setMessages((prev) => prev.slice(0, -1));
    }
    await processMessage(lastUserMessage.content, true);
  };

  // ── Core message processor ─────────────────────────────────────────────────
  const processMessage = async (messageContent: string, isRegeneration: boolean = false) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please sign in to chat with JURIST MIND", variant: "destructive" });
      return;
    }

    try {
      const { data: usageCheck, error: usageError } = await supabase.functions.invoke("check-ai-usage");
      if (usageError || !usageCheck?.allowed) {
        const reason = usageCheck?.reason || "Usage limit reached";
        toast({
          title: "Usage Limit Reached",
          description: `${reason} — Upgrade your plan to continue!`,
          variant: "destructive",
          action: <Button variant="outline" size="sm" onClick={() => navigate("/upgrade")}>Upgrade Now</Button>,
        });
        return;
      }
      if (usageCheck.requests_remaining > 0 && usageCheck.requests_remaining < 10) {
        toast({ title: "Usage Notice", description: `You have ${usageCheck.requests_remaining} requests remaining today` });
      }
    } catch (error) {
      console.error("Error checking usage:", error);
      toast({ title: "Error", description: "Failed to check usage limits. Please try again.", variant: "destructive" });
      return;
    }

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      if (!sessionId) {
        toast({ title: "Error", description: "Failed to create chat session", variant: "destructive" });
        return;
      }
      setCurrentSessionId(sessionId);
      navigate(`/chat/${sessionId}`, { replace: true });
    }

    if (!isRegeneration) {
      setInputValue("");
      const tempMessageId = Date.now().toString();
      const newMessage: Message = { id: tempMessageId, content: messageContent, sender: "user", timestamp: new Date() };
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
      setMessages((prev) => [...prev, newMessage]);

      const userDbId = await saveMessage(sessionId, messageContent, "user");
      if (userDbId) {
        setMessages((prev) => prev.map((msg) => (msg.id === tempMessageId ? { ...msg, db_id: userDbId } : msg)));
      }
      if (messages.length === 0) await updateSessionTitle(sessionId, messageContent);
    }

    setIsLoading(true);

    const aiTempId = (Date.now() + 1).toString();
    const aiPlaceholder: Message = { id: aiTempId, content: "", sender: "ai", timestamp: new Date() };
    setMessages((prev) => [...prev, aiPlaceholder]);

    try {
      const formData = new FormData();
      formData.append("question", messageContent);
      if (sessionId) formData.append("chat_id", sessionId);
      if (user?.id) formData.append("user_id", user.id);

      const response = await fetch("https://juristmind.onrender.com/ask", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to get AI response");
      if (!response.body) throw new Error("No response body from server");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let done = false;

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
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, content: fullContent } : msg)));
              }
              if (data.type === "done") done = true;
            } catch (parseError) {
              console.log("Chunk parse info:", parseError);
            }
          }
        }
      }

      if (!fullContent) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          fullContent = data.answer || data.content || "I'm JURIST MIND, your legal AI assistant.";
          setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, content: fullContent } : msg)));
        } catch {
          fullContent = "Response received but could not be parsed.";
        }
      }

      if (fullContent) {
        const aiDbId = await saveMessage(sessionId, fullContent, "ai");
        if (aiDbId) {
          setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, db_id: aiDbId } : msg)));
        }
      }

      try {
        await supabase.functions.invoke("increment-ai-usage", { body: { points: 1 } });
      } catch (error) {
        console.error("Error incrementing usage:", error);
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      toast({ title: "Error", description: "Failed to connect to AI assistant. Please try again later.", variant: "destructive" });
      const errorContent = "I'm having trouble connecting right now. Please try again later.";
      setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, content: errorContent } : msg)));
      await saveMessage(sessionId, errorContent, "ai");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    await processMessage(inputValue);
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
      const loadedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        db_id: msg.id,
        content: msg.content,
        sender: msg.sender as "user" | "ai",
        timestamp: new Date(msg.created_at),
        sources: [],
      }));
      setMessages(loadedMessages);
      setCurrentSessionId(sessionId);
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    } catch (error) {
      console.error("Error loading session:", error);
      toast({ title: "Error", description: "Failed to load chat session", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full chat-bg">
      <div className="flex flex-col flex-1 h-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <img src={JURIST_LOGO} alt="Jurist Mind" className="w-8 h-8 rounded-full object-cover" />
            <h1 className="text-base font-semibold text-foreground tracking-tight">JURIST MIND</h1>
          </div>
          <Button
            onClick={handleNewChat}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.05)] rounded-lg"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* ── Messages ── */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          <div className="max-w-3xl mx-auto p-6">
            {messages.length === 0 ? (
              /* ── Empty state ── */
              <div className="text-center pt-[15vh] pb-10 animate-fade-in">
                <div className="flex justify-center mb-6">
                  <img
                    src={JURIST_LOGO}
                    alt="Jurist Mind"
                    className="w-14 h-14 rounded-2xl object-cover shadow-gold"
                  />
                </div>
                <h2 className="text-[clamp(2rem,5vw,3rem)] font-bold text-foreground mb-3 tracking-[-0.03em] bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                  JURIST MIND
                </h2>
                <p className="text-base text-muted-foreground mb-10 tracking-wide font-light">
                  {user ? "What do you want to know?" : "Please sign in to start chatting"}
                </p>

                {user && (
                  <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground border border-[rgba(255,255,255,0.1)] hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all btn-lift"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {!user && (
                  <Button
                    onClick={() => navigate("/auth")}
                    className="mt-4 bg-gradient-primary text-gold-foreground hover:shadow-gold-lg btn-lift btn-press font-semibold"
                  >
                    Sign In to Continue
                  </Button>
                )}
              </div>
            ) : (
              /* ── Message list ── */
              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                    style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
                  >
                    {/* AI avatar */}
                    {message.sender === "ai" && (
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/30 mr-3 mt-1 flex-shrink-0">
                        <img src={JURIST_LOGO} alt="Jurist Mind" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className={`max-w-[70%] p-4 ${message.sender === "user" ? "msg-user" : "msg-ai"}`}>
                      {/* Content */}
                      {message.content ? (
                        <div className={`text-sm leading-relaxed break-words ${message.sender === "user" ? "prose-invert" : ""}`}>
                          {message.sender === "ai" ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                                code: ({ node, className, ...props }) => (
                                  <code className={`bg-muted/50 px-1 py-0.5 rounded font-mono text-xs ${className}`} {...props} />
                                ),
                                pre: ({ node, ...props }) => (
                                  <div className="overflow-x-auto w-full my-2 bg-muted/50 p-2 rounded-lg">
                                    <pre className="text-xs" {...props} />
                                  </div>
                                ),
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-4 border rounded-lg">
                                    <table className="min-w-full divide-y divide-border bg-card text-card-foreground" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-muted/50" {...props} />,
                                tbody: ({ node, ...props }) => <tbody className="divide-y divide-border bg-background" {...props} />,
                                tr: ({ node, ...props }) => <tr className="hover:bg-muted/50 transition-colors" {...props} />,
                                th: ({ node, ...props }) => (
                                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />
                                ),
                                td: ({ node, ...props }) => <td className="px-4 py-3 text-sm whitespace-nowrap" {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                      ) : (
                        /* Loading indicator with timed phases */
                        <TypingIndicator />
                      )}

                      {/* Timestamp */}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>

                      {/* Sources */}
                      {message.sender === "ai" && message.sources && message.sources.length > 0 && (
                        <SourceDisplay sources={message.sources} />
                      )}

                      {/* ── AI action bar: Copy · Regenerate · Like · Dislike ── */}
                      {message.sender === "ai" && message.content && (
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                          {/* Copy */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(message.content, message.id)}
                            title="Copy to clipboard"
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          {/* Regenerate — only on last AI message */}
                          {index === messages.length - 1 && !isLoading && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={handleRegenerate}
                              title="Regenerate response"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          <div className="flex-1" />

                          {/* Thumbs up */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-green-500"
                            onClick={() => handleFeedback(message, true)}
                            title="Good response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Button>

                          {/* Thumbs down */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            onClick={() => handleFeedback(message, false)}
                            title="Bad response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Jump to latest button */}
          {showJumpToLatest && (
            <Button
              onClick={handleJumpToLatest}
              className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 bg-secondary/90 backdrop-blur-lg text-foreground border border-[rgba(255,255,255,0.1)] hover:border-primary/40 hover:shadow-gold rounded-full px-4 btn-lift"
              size="sm"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Jump to latest
            </Button>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="flex-shrink-0 px-6 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="chat-input-glass rounded-2xl px-4 py-3 flex gap-3 items-end">
              <Button
                size="sm"
                variant="ghost"
                className="p-2 h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 mb-0.5"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <TextareaAutosize
                ref={inputRef}
                minRows={1}
                maxRows={5}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to know?"
                className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 placeholder:italic py-2"
              />

              <div className="flex gap-1.5 flex-shrink-0 mb-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !user}
                  className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-gold hover:shadow-gold-lg btn-lift btn-press disabled:opacity-30 disabled:bg-muted disabled:shadow-none disabled:bg-none transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-gold-foreground" />
                </button>
              </div>
            </div>

            <div className="text-center mt-3">
              <p className="text-[10px] text-muted-foreground/60">
                By using Jurist Mind, you consent to the{" "}
                <NavLink to="/terms" className="text-primary/70 hover:text-primary hover:underline transition-colors">
                  terms and conditions
                </NavLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}