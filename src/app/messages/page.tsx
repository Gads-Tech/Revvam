"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MobileNav from "@/components/MobileNav";

type User = { id: string; name: string; username: string; image: string | null };
type Conversation = { id: string; updatedAt: string; user: User | null; lastMessage: { content: string; createdAt: string } | null };
type Message = { id: string; senderId: string; content: string; createdAt: string; sender: User };

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function loadConversations() {
    try {
      const response = await fetch("/api/messages", { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load messages.");
      setConversations(data.conversations ?? []);
      setConversationId((current) => current || data.conversations?.[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }

  async function loadConversation(id: string, silent = false) {
    if (!id) return;
    if (!silent) setChatLoading(true);
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load conversation.");
      setMessages(data.messages ?? []);
      setOtherUser(data.otherUser ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversation.");
    } finally {
      if (!silent) setChatLoading(false);
    }
  }

  useEffect(() => {
    const queryConversation = new URLSearchParams(window.location.search).get("conversation");
    if (queryConversation) setConversationId(queryConversation);
    loadConversations();
  }, []);

  useEffect(() => {
    if (conversationId) loadConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => loadConversation(conversationId, true), 3500);
    return () => window.clearInterval(timer);
  }, [conversationId]);

  async function startConversation() {
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to start conversation.");
      setUsername("");
      setConversationId(data.conversationId);
      await loadConversations();
      await loadConversation(data.conversationId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start conversation.");
    }
  }

  async function sendMessage() {
    const clean = content.trim();
    if (!conversationId || !clean || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: clean }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to send message.");
      setContent("");
      await loadConversation(conversationId, true);
      await loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-red-400/70">Revvam social</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.045em]">Messages</h1>
          </div>
          <Link href="/home" className="text-sm text-white/35 hover:text-white">Discover</Link>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="mt-6 grid min-h-[620px] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-white/[0.07] p-4 lg:border-b-0 lg:border-r">
            <div className="flex gap-2">
              <input value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") startConversation(); }} placeholder="Message @username" className="min-w-0 flex-1 rounded-xl border border-white/[0.10] bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" />
              <button type="button" onClick={startConversation} className="rounded-xl border border-red-400/20 bg-red-500/[0.10] px-3 text-xs font-semibold text-red-300">Start</button>
            </div>

            <div className="mt-4 space-y-1">
              {loading ? <p className="px-3 py-8 text-center text-sm text-white/25">Loading...</p> : conversations.length === 0 ? <p className="px-3 py-8 text-center text-sm leading-6 text-white/25">No conversations yet. Enter a username above to start one.</p> : conversations.map((conversation) => conversation.user && (
                <button key={conversation.id} type="button" onClick={() => setConversationId(conversation.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${conversation.id === conversationId ? "bg-red-500/[0.08]" : "hover:bg-white/[0.04]"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{conversation.user.image ? <img src={conversation.user.image} alt="" className="h-full w-full object-cover" /> : conversation.user.name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{conversation.user.name}</span><span className="block truncate text-xs text-white/25">@{conversation.user.username}</span>{conversation.lastMessage && <span className="mt-1 block truncate text-[10px] text-white/20">{conversation.lastMessage.content}</span>}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[520px] flex-col">
            {chatLoading ? <div className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></div> : !conversationId ? <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><div className="text-5xl opacity-30">💬</div><h2 className="mt-5 text-xl font-semibold">Start a conversation</h2><p className="mt-2 max-w-sm text-sm leading-6 text-white/30">Enter another Revvam username to send them a private message.</p></div> : <>
              <header className="border-b border-white/[0.07] px-5 py-4 sm:px-7">
                {otherUser ? <Link href={`/users/${encodeURIComponent(otherUser.username)}`} className="flex items-center gap-3 hover:text-red-300"><span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{otherUser.image ? <img src={otherUser.image} alt="" className="h-full w-full object-cover" /> : otherUser.name.charAt(0).toUpperCase()}</span><span><span className="block font-semibold">{otherUser.name}</span><span className="block text-xs text-white/25">@{otherUser.username}</span></span></Link> : <span className="text-sm text-white/30">Conversation</span>}
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-7">
                {messages.length === 0 ? <p className="py-10 text-center text-sm text-white/25">No messages yet. Say hello.</p> : messages.map((message) => {
                  const mine = message.sender.id !== otherUser?.id;
                  return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-red-600/20 text-white" : "rounded-bl-md bg-white/[0.06] text-white/70"}`}>{message.content}</div></div>;
                })}
              </div>
              <div className="border-t border-white/[0.07] p-4 sm:p-5"><div className="flex gap-2"><textarea value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder="Write a message..." className="min-h-11 flex-1 resize-none rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" /><button type="button" onClick={sendMessage} disabled={sending || !content.trim()} className="rounded-2xl border border-red-400/20 bg-red-500/[0.12] px-5 text-sm font-semibold text-red-300 disabled:opacity-40">{sending ? "..." : "Send"}</button></div></div>
            </>}
          </section>
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
