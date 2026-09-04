import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  ArrowUp,
  Loader2,
} from "lucide-react";
import Markdown from "react-markdown";
import { ChatMessage } from "../types";

interface ChatInterfaceProps {
  docId: string;
  pdfBase64: string;
  filename: string;
}

const EXAMPLE_QUESTIONS = [
  "Summarize this document",
  "What are the main points?",
  "Explain this in simple language",
  "Find the important dates",
  "What are the key numbers?",
  "Give me a short conclusion",
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  docId,
  pdfBase64,
  filename,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || inputValue).trim();
    if (!question || isLoading) return;

    setErrorMessage(null);
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `ai-${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        content: question,
        timestamp: Date.now(),
      },
    ];

    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId,
          pdfBase64,
          message: question,
          chatHistory: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong while analyzing your question. Please try again.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: data.answer || "No response received.",
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      console.error("Chat request failed:", err);
      setErrorMessage(err.message || "Something went wrong while answering. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([]);
    setErrorMessage(null);
  };

  return (
    <div id="ai-chat-section" className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Chat Section Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Ask Document AI</h3>
            <p className="text-[11px] text-slate-400">Answers are strictly sourced from this PDF</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            id="btn-clear-chat"
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Clear chat history"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[260px] max-h-[460px]">
        {messages.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <HelpCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1">
              Have questions about this document?
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
              Select a suggested question below or ask your own question.
            </p>

            {/* Example questions chips (Sleek Interface style) */}
            <div className="max-w-md mx-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Suggested Questions</span>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-xs sm:text-sm leading-relaxed space-y-2">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}

                  {!isUser && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>Source: {filename}</span>
                      <button
                        type="button"
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 text-sm justify-start">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-slate-600 text-xs shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing document and formulating answer...</span>
            </div>
          </div>
        )}

        {/* Error banner inside chat */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts shortcut strip when chat is active */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-500 whitespace-nowrap bg-slate-50/50">
          <span className="font-semibold text-slate-400">Prompts:</span>
          {EXAMPLE_QUESTIONS.slice(0, 3).map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-0.5 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form (Matching Sleek Interface rounded-2xl with shadow-inner and indigo submit) */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <input
            id="chat-input-textarea"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about this PDF..."
            disabled={isLoading}
            className="w-full pl-5 pr-14 py-3.5 bg-slate-100 border border-transparent rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner text-slate-800 placeholder:text-slate-400"
          />

          <button
            id="btn-send-chat"
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-indigo-700 transition-transform active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer"
            title="Send question"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2.5 tracking-wide uppercase font-medium">
          AI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};
