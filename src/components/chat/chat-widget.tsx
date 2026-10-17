"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatEvent } from "@/lib/chat/protocol";
import type { Dictionary, Locale } from "@/lib/i18n";
import { Markdown } from "./markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "deoria-chat-v1";
const MAX_HISTORY = 19; // the server accepts 20 messages; leave room for the new question

function loadHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === "string" && m.content) : [];
  } catch {
    return [];
  }
}

export function ChatWidget({ locale, dict }: { locale: Locale; dict: Dictionary["chat"] }) {
  const [open, setOpen] = useState(false);
  // Only the closed launcher renders on the server, so a lazy client-side load cannot cause a hydration mismatch.
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (!busy) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage unavailable (private mode); the chat still works for this page view.
    }
  }, [messages, busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, 2000);
      if (!question || busy) return;

      const history = [...messages, { role: "user" as const, content: question }].slice(-MAX_HISTORY);
      // The server requires the conversation to start with a user turn.
      while (history.length && history[0].role !== "user") history.shift();

      setMessages([...messages, { role: "user", content: question }, { role: "assistant", content: "" }]);
      setInput("");
      setError(null);
      setBusy(true);
      setStatus(dict.thinking);

      const controller = new AbortController();
      abortRef.current = controller;
      let received = "";
      let failed = false;

      const append = (delta: string) => {
        received += delta;
        setMessages((prev) => {
          const next = prev.slice();
          next[next.length - 1] = { role: "assistant", content: received };
          return next;
        });
      };

      const fail = (message: string) => {
        if (failed) return;
        failed = true;
        setError(message);
        if (!received) {
          // Drop the unanswered pair so roles keep alternating, and give the question back.
          setMessages((prev) => prev.slice(0, -2));
          setInput(question);
        }
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, messages: history }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          fail(res.status === 429 ? dict.rateLimited : res.status === 503 ? dict.unavailable : dict.error);
          return;
        }

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            const event = JSON.parse(line) as ChatEvent;
            switch (event.type) {
              case "text":
                setStatus(null);
                append(event.delta);
                break;
              case "status":
                setStatus(dict.thinking);
                break;
              case "break":
                if (received && !received.endsWith("\n\n")) append("\n\n");
                break;
              case "error":
                fail(
                  event.code === "unavailable" ? dict.unavailable : event.code === "overloaded" ? dict.rateLimited : dict.error,
                );
                break;
            }
          }
        }
        if (!received.trim()) fail(dict.error);
      } catch (e) {
        if ((e as Error).name !== "AbortError") fail(dict.error);
      } finally {
        setBusy(false);
        setStatus(null);
        abortRef.current = null;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            const trimmed = last.content.trim();
            return trimmed ? [...prev.slice(0, -1), { role: "assistant", content: trimmed }] : prev.slice(0, -1);
          }
          return prev;
        });
      }
    },
    [busy, dict, locale, messages],
  );

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput("");
  };

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2.5 rounded-full bg-ink py-3 pr-5 pl-4 text-sm font-medium text-paper shadow-[0_12px_32px_-8px_rgba(26,24,19,.45)] transition hover:-translate-y-0.5 hover:bg-accent sm:right-6 sm:bottom-6"
        >
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          {dict.open}
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={dict.title}
          className="fixed inset-x-2 bottom-2 z-50 flex max-h-[min(640px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_24px_64px_-12px_rgba(26,24,19,.35)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-ink/10 bg-ink px-5 py-4 text-paper">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <span className="size-2 rounded-full bg-accent" aria-hidden />
                {dict.title}
              </h2>
              <p className="mt-0.5 text-xs text-night-muted">{dict.subtitle}</p>
            </div>
            <div className="flex gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full px-3 py-1.5 text-xs text-night-muted hover:bg-paper/10 hover:text-paper"
                >
                  {dict.reset}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  launcherRef.current?.focus();
                }}
                aria-label={dict.close}
                className="grid size-8 place-items-center rounded-full text-lg leading-none hover:bg-paper/10"
              >
                ×
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink-2">
              {dict.greeting}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {dict.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-left text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-paper"
                >
                  {m.content}
                </div>
              ) : m.content ? (
                <div
                  key={i}
                  className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink-2"
                >
                  <Markdown text={m.content} />
                </div>
              ) : null,
            )}

            {status && (
              <div className="flex items-center gap-2 px-1 text-xs text-muted-2">
                <span className="flex gap-1" aria-hidden>
                  <span className="typing-dot size-1.5 rounded-full bg-accent" />
                  <span className="typing-dot size-1.5 rounded-full bg-accent [animation-delay:.2s]" />
                  <span className="typing-dot size-1.5 rounded-full bg-accent [animation-delay:.4s]" />
                </span>
                {status}
              </div>
            )}
            {error && (
              <p className="rounded-xl bg-warn-bg px-3 py-2 text-xs text-warn-fg" role="alert">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-ink/10 bg-white px-3 pt-3 pb-2"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={dict.placeholder}
                aria-label={dict.placeholder}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-sm outline-none focus:border-ink/40"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-40 disabled:hover:bg-ink"
              >
                {dict.send}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10.5px] text-faint">{dict.disclaimer}</p>
          </form>
        </section>
      )}
    </>
  );
}
