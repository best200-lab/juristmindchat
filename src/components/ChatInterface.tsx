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

const JURIST_LOGO =
  "https://phmywmbqvaforkjohoza.supabase.co/storage/v1/object/public/avatars/JURISTAI-Photoroom.png";

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

// ── Typing indicator with timed phases ──────────────────────────────────────
function TypingIndicator() {
  const [phase, setPhase] = useState<"dots" | "deep" | "almost">("dots");

  useEffect(() => {
    let elapsed = 0;
    const ticker = setInterval(() => {
      elapsed += 1;
      if (elapsed >= 40) setPhase("almost");
      else if (elapsed >= 20) setPhase("deep");
      else setPhase("dots");
    }, 1000);
    return () => clearInterval(ticker);
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
  const isNewChatRef = useRef(false);

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

  // ── Session loading ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (urlSessionId) {
      isNewChatRef.current = false;
      setMessages([]);
      loadSession(urlSessionId);
    } else {
      if (!isNewChatRef.current) loadMostRecentSession();
    }
  }, [user, urlSessionId]);

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
            return [...prev, {
              id: newMsg.id, db_id: newMsg.id, content: newMsg.content,
              sender: newMsg.sender as "user" | "ai", timestamp: new Date(newMsg.created_at),
            }];
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
        .from("chat_sessions").select("id").eq("user_id", user.id)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (data) navigate(`/chat/${data.id}`, { replace: true });
    } catch (error) { console.error("Error loading recent session:", error); }
  };

  const createNewSession = async () => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("chat_sessions").insert({ user_id: user.id, title: "New Chat" }).select().single();
      if (error) throw error;
      return data.id;
    } catch (error) { console.error("Error creating session:", error); return null; }
  };

  const saveMessage = async (sessionId: string, content: string, sender: "user" | "ai"): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("chat_messages").insert({ session_id: sessionId, content, sender })
        .select("id, created_at").single();
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
    try { await supabase.from("chat_sessions").update({ title }).eq("id", sessionId); }
    catch (error) { console.error("Error updating session title:", error); }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    isNewChatRef.current = true;
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
        message_id: message.db_id, user_id: user.id, is_positive: isPositive,
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
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
      setMessages((prev) => [...prev, { id: tempMessageId, content: messageContent, sender: "user", timestamp: new Date() }]);

      const userDbId = await saveMessage(sessionId, messageContent, "user");
      if (userDbId) {
        setMessages((prev) => prev.map((msg) => (msg.id === tempMessageId ? { ...msg, db_id: userDbId } : msg)));
      }
      if (messages.length === 0) await updateSessionTitle(sessionId, messageContent);
    }

    setIsLoading(true);
    const aiTempId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiTempId, content: "", sender: "ai", timestamp: new Date() }]);

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
            } catch (parseError) { console.log("Chunk parse info:", parseError); }
          }
        }
      }

      if (!fullContent) {
        try {
          const text = await response.text();
          const data = JSON.parse(text);
          fullContent = data.answer || data.content || "I'm JURIST MIND, your legal AI assistant.";
          setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, content: fullContent } : msg)));
        } catch { fullContent = "Response received but could not be parsed."; }
      }

      if (fullContent) {
        const aiDbId = await saveMessage(sessionId, fullContent, "ai");
        if (aiDbId) {
          setMessages((prev) => prev.map((msg) => (msg.id === aiTempId ? { ...msg, db_id: aiDbId } : msg)));
        }
      }

      try { await supabase.functions.invoke("increment-ai-usage", { body: { points: 1 } }); }
      catch (error) { console.error("Error incrementing usage:", error); }
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
        .from("chat_messages").select("id, content, sender, created_at")
        .eq("session_id", sessionId).order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) { setMessages([]); setCurrentSessionId(sessionId); return; }
      setMessages(data.map((msg) => ({
        id: msg.id, db_id: msg.id, content: msg.content,
        sender: msg.sender as "user" | "ai", timestamp: new Date(msg.created_at), sources: [],
      })));
      setCurrentSessionId(sessionId);
      shouldAutoScrollRef.current = true;
      setShowJumpToLatest(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    } catch (error) {
      console.error("Error loading session:", error);
      toast({ title: "Error", description: "Failed to load chat session", variant: "destructive" });
    } finally { setIsLoading(false); }
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
      <div className="flex flex-col flex-1 h-full min-w-0">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src={JURIST_LOGO} alt="Jurist Mind" className="w-7 h-7 rounded-full object-cover ring-1 ring-primary/20" />
            <h1 className="text-sm font-semibold text-foreground tracking-tight">JURIST MIND</h1>
          </div>
          <Button
            onClick={handleNewChat}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.05)] rounded-lg text-xs h-8 px-3"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </Button>
        </div>

        {/* ── Messages area ── */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {/* Centred column, same width as input box */}
          <div className="max-w-2xl mx-auto px-4 py-10 w-full">

            {messages.length === 0 ? (
              /* ── Welcome / empty state ── */
              <div className="text-center pt-[10vh] pb-10 animate-fade-in select-none">
                <div className="flex justify-center mb-5">
                  <img
                    src={JURIST_LOGO}
                    alt="Jurist Mind"
                    className="w-16 h-16 rounded-2xl object-cover shadow-gold"
                  />
                </div>
                <h2 className="text-4xl font-bold mb-2 tracking-[-0.03em] bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                  JURIST MIND
                </h2>
                <p className="text-sm text-muted-foreground mb-10 font-light">
                  {user ? "Your AI-powered legal research assistant" : "Please sign in to start chatting"}
                </p>

                {user && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-[rgba(255,255,255,0.1)] hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {!user && (
                  <Button
                    onClick={() => navigate("/auth")}
                    className="mt-6 bg-gradient-primary text-gold-foreground hover:shadow-gold-lg font-semibold"
                  >
                    Sign In to Continue
                  </Button>
                )}
              </div>
            ) : (
              /* ── Message thread ── */
              <div className="space-y-8 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(index * 20, 100)}ms` }}
                  >
                    {message.sender === "user" ? (
                      /* ── User bubble: right-aligned, no label ── */
                      <div className="flex justify-end">
                        <div
                          className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
                          style={{
                            background: "linear-gradient(135deg, hsl(240,15%,16%), hsl(240,12%,22%))",
                            color: "hsl(240,10%,96%)",
                          }}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          <p className="text-[10px] mt-1.5 opacity-40 text-right">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ── AI response: full width, NO border, NO background ── */
                      <div className="flex gap-3 items-start">
                        {/* Logo avatar */}
                        <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-primary/20 flex-shrink-0 mt-0.5">
                          <img src={JURIST_LOGO} alt="Jurist Mind" className="w-full h-full object-cover" />
                        </div>

                        {/* Content — raw text, no box */}
                        <div className="flex-1 min-w-0">
                          {message.content ? (
                            <>
                              <div className="text-sm leading-7 text-foreground">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-7" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                                    em: ({ node, ...props }) => <em className="italic text-muted-foreground" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1.5" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5" {...props} />,
                                    li: ({ node, ...props }) => <li className="leading-6" {...props} />,
                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-base font-semibold mt-5 mb-2 text-foreground" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mt-4 mb-1.5 text-foreground/90" {...props} />,
                                    blockquote: ({ node, ...props }) => (
                                      <blockquote className="border-l-2 border-primary/40 pl-4 my-3 text-muted-foreground italic" {...props} />
                                    ),
                                    code: ({ node, className, children, ...props }) => {
                                      const isInline = !className;
                                      return isInline ? (
                                        <code className="bg-muted/60 px-1.5 py-0.5 rounded text-[0.82em] font-mono text-primary/90" {...props}>
                                          {children}
                                        </code>
                                      ) : (
                                        <code className={`font-mono text-xs ${className}`} {...props}>{children}</code>
                                      );
                                    },
                                    pre: ({ node, ...props }) => (
                                      <div className="overflow-x-auto my-3 bg-muted/40 border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                                        <pre className="text-xs leading-5" {...props} />
                                      </div>
                                    ),
                                    table: ({ node, ...props }) => (
                                      <div className="overflow-x-auto my-4 rounded-xl border border-[rgba(255,255,255,0.08)]">
                                        <table className="min-w-full text-sm" {...props} />
                                      </div>
                                    ),
                                    thead: ({ node, ...props }) => <thead className="bg-muted/30 border-b border-[rgba(255,255,255,0.06)]" {...props} />,
                                    tbody: ({ node, ...props }) => <tbody className="divide-y divide-[rgba(255,255,255,0.04)]" {...props} />,
                                    tr: ({ node, ...props }) => <tr className="hover:bg-muted/20 transition-colors" {...props} />,
                                    th: ({ node, ...props }) => (
                                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />
                                    ),
                                    td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-foreground/90" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="my-4 border-[rgba(255,255,255,0.08)]" {...props} />,
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>

                              {/* Sources */}
                              {message.sources && message.sources.length > 0 && (
                                <SourceDisplay sources={message.sources} />
                              )}

                              {/* ── Action row ── */}
                              <div className="flex items-center gap-0.5 mt-3 -ml-1">
                                <button
                                  onClick={() => handleCopy(message.content, message.id)}
                                  title="Copy"
                                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                >
                                  {copiedId === message.id
                                    ? <Check className="w-3.5 h-3.5 text-primary" />
                                    : <Copy className="w-3.5 h-3.5" />}
                                </button>

                                {index === messages.length - 1 && !isLoading && (
                                  <button
                                    onClick={handleRegenerate}
                                    title="Regenerate"
                                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] transition-all"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <div className="flex-1" />

                                <button
                                  onClick={() => handleFeedback(message, true)}
                                  title="Good response"
                                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-green-500 hover:bg-green-500/10 transition-all"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(message, false)}
                                  title="Bad response"
                                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="py-1">
                              <TypingIndicator />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Jump to latest */}
          {showJumpToLatest && (
            <div className="sticky bottom-4 flex justify-center pointer-events-none">
              <Button
                onClick={handleJumpToLatest}
                size="sm"
                className="pointer-events-auto flex items-center gap-2 bg-secondary/90 backdrop-blur-lg text-foreground border border-[rgba(255,255,255,0.1)] hover:border-primary/40 rounded-full px-4 shadow-lg"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                Jump to latest
              </Button>
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div className="flex-shrink-0 px-4 pb-5 pt-2">
          <div className="max-w-2xl mx-auto">
            <div className="chat-input-glass rounded-2xl px-4 py-3 flex gap-3 items-end">
              <Button
                size="sm"
                variant="ghost"
                className="p-2 h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 mb-0.5"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <TextareaAutosize
                ref={inputRef}
                minRows={1}
                maxRows={6}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything legal…"
                className="flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/50 py-1.5 leading-6"
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
                  className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-gold hover:shadow-gold-lg btn-lift btn-press disabled:opacity-25 disabled:shadow-none transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-gold-foreground" />
                </button>
              </div>
            </div>

            <p className="text-center mt-2.5 text-[10px] text-muted-foreground/40">
              By using Jurist Mind, you agree to the{" "}
              <NavLink to="/terms" className="text-primary/60 hover:text-primary hover:underline transition-colors">
                terms and conditions
              </NavLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 