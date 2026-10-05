"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import MobileNav from "@/components/MobileNav";
import { BackIcon, CloseIcon, MoreIcon, SendIcon, MessageIcon, PlusIcon, ImageIcon, CameraIcon, LocationIcon, MicIcon } from "@/components/icons";
import LiveSocialActions from "@/components/LiveSocialActions";

type User = { id: string; name: string; username: string; image: string | null; role?: string | null; onboardingType?: string | null; presence?: { online: boolean | null; lastSeenAt: string | null } };
type Reply = { id: string; content: string; senderId: string; sender: { id: string; name: string; username: string } };
type Message = { id: string; senderId: string; content: string; createdAt: string; sender: User; opened?: boolean; replyTo?: Reply | null; messageType?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "LOCATION"; mediaUrl?: string | null; latitude?: number | null; longitude?: number | null };
type ChatStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "DECLINED" | "DECLINED_BY_TARGET" | "ACCEPTED" | "SELF";
type ContextMenu = { x: number; y: number; message: Message } | null;
type EntryScrollMode = "restore" | "bottom";

const NEW_MESSAGE_THRESHOLD_PX = 80;
const LONG_PRESS_MS = 550;
const DELETE_FOR_BOTH_MS = 2 * 60 * 1000;

function presenceLabel(presence?: User["presence"]) {
  if (presence?.online === true) return "Online";
  if (!presence?.lastSeenAt) return "";
  const diff = Math.max(0, Date.now() - new Date(presence.lastSeenAt).getTime());
  if (diff < 60_000) return "Last seen just now";
  if (diff < 3_600_000) return "Last seen " + Math.floor(diff / 60_000) + "m ago";
  if (diff < 86_400_000) return "Last seen " + Math.floor(diff / 3_600_000) + "h ago";
  return "Last seen " + Math.floor(diff / 86_400_000) + "d ago";
}

export default function IndividualMessagePage() {
  const params = useParams();
  const router = useRouter();
  const username = String(params.username || "");
  const isComposer = username === "new";

  const [user, setUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [chatStatus, setChatStatus] = useState<ChatStatus>("NONE");
  const [conversationId, setConversationId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPhotoUrl, setPendingPhotoUrl] = useState("");
  const [pendingPhotoCaption, setPendingPhotoCaption] = useState("");
  const [pendingPhotoRotation, setPendingPhotoRotation] = useState(0);
  const [pendingPhotoCrop, setPendingPhotoCrop] = useState<"ORIGINAL" | "SQUARE" | "PORTRAIT" | "LANDSCAPE">("ORIGINAL");
  const [viewerMedia, setViewerMedia] = useState<{ type: "IMAGE" | "VIDEO"; url: string; index: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const entryScrollModeRef = useRef<EntryScrollMode>("restore");
  const entryScrollHandledRef = useRef(false);
  const firstConversationLoadRef = useRef(true);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const pollingReadyRef = useRef(false);
  const pollControllerRef = useRef<AbortController | null>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const attachmentsRef = useRef<HTMLDivElement | null>(null);
  const pendingPhotoUrlRef = useRef("");

  function scrollStorageKey(id: string) { return `revvam:chat-scroll:${id}`; }

  function isNearBottom(container = messagesContainerRef.current) {
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight <= NEW_MESSAGE_THRESHOLD_PX;
  }

  async function markConversationRead(id = conversationId) {
    if (!id) return;
    try {
      await fetch(`/api/messages/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
      setNewMessageCount(0);
    } catch {}
  }

  async function loadTarget() {
    if (!username || isComposer) return;
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load user.");
      setUser(data.user);
      const chatResponse = await fetch(`/api/users/${encodeURIComponent(username)}/chat-request`, { credentials: "include", cache: "no-store" });
      const chatData = await chatResponse.json();
      if (chatResponse.ok && chatData.success) {
        setChatStatus(chatData.status as ChatStatus);
        setConversationId(chatData.conversationId || "");
        if (chatData.message) setRequestMessage(chatData.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load user.");
    } finally { setLoading(false); }
  }

  async function loadConversation(id: string, silent = false) {
    if (!id) return;
    if (pollControllerRef.current) {
      if (silent) return;
      pollControllerRef.current.abort();
    }
    const controller = new AbortController();
    pollControllerRef.current = controller;
    try {
      const markRead = !silent;
      const response = await fetch(`/api/messages/${encodeURIComponent(id)}?${markRead ? "markRead=1&" : ""}_=${Date.now()}`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load chat.");
      const nextMessages: Message[] = data.messages ?? [];
      if (!silent && firstConversationLoadRef.current) {
        entryScrollModeRef.current = Number(data.unreadBeforeOpen) > 0 ? "bottom" : "restore";
        firstConversationLoadRef.current = false;
        setNewMessageCount(0);
      }
      if (data.currentUserId) setCurrentUserId(String(data.currentUserId));
      if (silent && pollingReadyRef.current) {
        const knownIds = knownMessageIdsRef.current;
        const incomingMessages = nextMessages.filter((message) => !knownIds.has(message.id) && message.senderId !== String(data.currentUserId || ""));
        const incomingCount = incomingMessages.length;
        const unreadCount = Number(data.unreadCount) || 0;
        const atBottom = isNearBottom();
        if (incomingCount > 0 || unreadCount > 0) {
          if (atBottom) {
            setNewMessageCount(0);
            void markConversationRead(id);
          } else {
            setNewMessageCount((current) => Math.max(current + incomingCount, unreadCount));
          }
        }
      }
      knownMessageIdsRef.current = new Set(nextMessages.map((message) => message.id));
      setMessages(nextMessages);
      setReceiptVisible(data.readReceiptsEnabledForOtherUser ?? true);
      if (data.otherUser) setUser(data.otherUser);
      if (silent) pollingReadyRef.current = true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (!silent) setError(e instanceof Error ? e.message : "Unable to load chat.");
    } finally {
      if (pollControllerRef.current === controller) pollControllerRef.current = null;
    }
  }

  useEffect(() => { void loadTarget(); }, [username]);

  useEffect(() => {
    if (!conversationId) return;
    pollControllerRef.current?.abort();
    entryScrollModeRef.current = "restore";
    entryScrollHandledRef.current = false;
    firstConversationLoadRef.current = true;
    knownMessageIdsRef.current = new Set();
    pollingReadyRef.current = false;
    setNewMessageCount(0);
    void loadConversation(conversationId);
    const timer = window.setInterval(() => void loadConversation(conversationId, true), 1500);
    const onFocus = () => void loadConversation(conversationId, true);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      pollControllerRef.current?.abort();
    };
  }, [conversationId]);

  function scrollConversationToBottom(repeat = false) {
    const container = messagesContainerRef.current;
    if (!container) return;
    const move = () => {
      if (bottomAnchorRef.current) bottomAnchorRef.current.scrollIntoView({ block: "end", behavior: "auto" });
      container.scrollTop = container.scrollHeight;
    };
    move(); requestAnimationFrame(move); requestAnimationFrame(() => requestAnimationFrame(move));
    if (repeat) { window.setTimeout(move, 50); window.setTimeout(move, 150); window.setTimeout(move, 300); }
  }

  function restoreConversationScroll() {
    const container = messagesContainerRef.current;
    if (!container || !conversationId) return;
    const raw = window.sessionStorage.getItem(scrollStorageKey(conversationId));
    const saved = raw === null ? null : Number(raw);
    if (saved !== null && Number.isFinite(saved)) {
      const restore = () => { container.scrollTop = Math.min(saved, Math.max(0, container.scrollHeight - container.clientHeight)); };
      restore(); requestAnimationFrame(restore); return;
    }
    scrollConversationToBottom(false);
  }

  useLayoutEffect(() => {
    if (!messagesContainerRef.current || entryScrollHandledRef.current) return;
    entryScrollHandledRef.current = true;
    if (entryScrollModeRef.current === "bottom") {
      window.sessionStorage.removeItem(scrollStorageKey(conversationId));
      scrollConversationToBottom(true);
    } else restoreConversationScroll();
  }, [messages, conversationId]);

  useEffect(() => {
    if (!conversationId || chatStatus !== "ACCEPTED" || !entryScrollHandledRef.current || entryScrollModeRef.current !== "bottom") return;
    const focusTimer = window.setTimeout(() => { composerRef.current?.focus({ preventScroll: true }); scrollConversationToBottom(true); }, 150);
    return () => window.clearTimeout(focusTimer);
  }, [conversationId, chatStatus]);

  useEffect(() => {
    if (!isComposer || search.trim().length < 1) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, { credentials: "include", cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.success) setResults(data.users ?? []);
      } catch {}
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [isComposer, search]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (event: Event) => { const target = event.target as Node | null; if (target && contextMenuRef.current?.contains(target)) return; setContextMenu(null); };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!attachmentsOpen) return;
    const close = (event: Event) => {
      const target = event.target as Node | null;
      if (target && attachmentsRef.current?.contains(target)) return;
      setAttachmentsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [attachmentsOpen]);

  const title = useMemo(() => user ? user.name || `@${user.username}` : `@${username}`, [user, username]);

  function chooseReply(message: Message) {
    setContextMenu(null); setReplyTo(message); requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
  }
  function cancelLongPress() { if (longPressTimerRef.current !== null) { window.clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }

  function handleMessageContextMenu(event: MouseEvent, message: Message) {
    event.preventDefault();
    const mine = message.senderId === currentUserId;
    const canDeleteBoth = mine && Date.now() - new Date(message.createdAt).getTime() <= DELETE_FOR_BOTH_MS;
    const menuWidth = 200, menuHeight = canDeleteBoth ? 132 : 94;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8), y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x: Math.max(8, x), y: Math.max(8, y), message });
  }

  function startTouchMessage(event: TouchEvent, message: Message) {
    cancelLongPress(); longPressTriggeredRef.current = false;
    touchStartXRef.current = event.touches[0]?.clientX ?? 0; touchStartYRef.current = event.touches[0]?.clientY ?? 0; setSwipingId(message.id);
    const touch = event.touches[0];
    if (touch) longPressTimerRef.current = window.setTimeout(() => { longPressTriggeredRef.current = true; setSwipingId(null); handleMessageContextMenu({ preventDefault: () => {}, clientX: touch.clientX, clientY: touch.clientY } as MouseEvent, message); }, LONG_PRESS_MS);
  }
  function moveTouchMessage(event: TouchEvent) { const touch = event.touches[0]; if (!touch) return; if (Math.abs(touch.clientX - touchStartXRef.current) > 12 || Math.abs(touch.clientY - touchStartYRef.current) > 12) cancelLongPress(); }
  function finishSwipe(event: TouchEvent, message: Message) {
    cancelLongPress(); const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current; const delta = touchStartXRef.current - endX;
    setSwipingId(null); touchStartXRef.current = 0; touchStartYRef.current = 0;
    if (!longPressTriggeredRef.current && delta >= 65) chooseReply(message); longPressTriggeredRef.current = false;
  }

  async function deleteMessage(message: Message, mode: "me" | "both") {
    if (!conversationId || deletingMessageId) return;
    const mine = message.senderId === currentUserId;
    if (mode === "both" && !mine) return;
    if (mode === "both" && Date.now() - new Date(message.createdAt).getTime() > DELETE_FOR_BOTH_MS) return;
    setDeletingMessageId(message.id); setContextMenu(null); setError("");
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(message.id)}`, { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ mode }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || "Unable to delete message.");
      setMessages((current) => current.filter((item) => item.id !== message.id)); knownMessageIdsRef.current.delete(message.id); if (replyTo?.id === message.id) setReplyTo(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete message."); } finally { setDeletingMessageId(null); }
  }

  async function sendRequest() {
    if (!user || !requestMessage.trim() || requestBusy) return;
    setRequestBusy(true); setError("");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.username)}/chat-request`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: requestMessage.trim() }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Unable to send chat request.");
      setChatStatus(data.status as ChatStatus); setRequestMessage("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send chat request."); } finally { setRequestBusy(false); }
  }

  async function sendMedia(file: File, type: "IMAGE" | "VIDEO" | "AUDIO", durationMs?: number, caption = "") {
    if (!conversationId || mediaBusy) return;
    if (type === "VIDEO" && (file.size > 10 * 1024 * 1024 || (durationMs ?? 0) > 60000)) return setError("Video must be 10 MB or less and no longer than 1 minute.");
    if (type === "AUDIO" && (durationMs ?? 0) > 60000) return setError("Audio must not exceed 1 minute.");
    setMediaBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", type);
      const up = await fetch("/api/messages/" + encodeURIComponent(conversationId) + "/media", { method: "POST", credentials: "include", body: form });
      const u = await up.json(); if (!up.ok || !u.success) throw new Error(u.error || "Upload failed.");
      const res = await fetch("/api/messages/" + encodeURIComponent(conversationId), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: caption || (type === "IMAGE" ? "Photo" : type === "VIDEO" ? "Video" : "Voice message"), messageType: type, mediaUrl: u.mediaUrl, mediaMimeType: u.mediaMimeType, mediaSize: u.mediaSize, durationMs: durationMs ?? null }) });
      const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || "Unable to send media.");
      await loadConversation(conversationId, true); scrollConversationToBottom(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send media."); } finally { setMediaBusy(false); }
  }
  function chooseMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; setAttachmentsOpen(false); if (!file) return;
    if (file.type.startsWith("image/")) {
      if (pendingPhotoUrlRef.current) URL.revokeObjectURL(pendingPhotoUrlRef.current);
      const url = URL.createObjectURL(file);
      pendingPhotoUrlRef.current = url;
      setPendingPhoto(file); setPendingPhotoUrl(url); setPendingPhotoCaption(""); setPendingPhotoRotation(0); setPendingPhotoCrop("ORIGINAL");
      return;
    }
    if (file.type.startsWith("video/")) { const url = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata"; video.onloadedmetadata = () => { const d = video.duration * 1000; URL.revokeObjectURL(url); void sendMedia(file, "VIDEO", d); }; video.src = url; return; }
    setError("Choose an image or video.");
  }
  function cancelPendingPhoto() {
    if (pendingPhotoUrlRef.current) URL.revokeObjectURL(pendingPhotoUrlRef.current);
    pendingPhotoUrlRef.current = ""; setPendingPhoto(null); setPendingPhotoUrl(""); setPendingPhotoCaption(""); setPendingPhotoRotation(0); setPendingPhotoCrop("ORIGINAL");
  }
  async function sendPendingPhoto() {
    if (!pendingPhoto || mediaBusy) return;
    let file = pendingPhoto;
    if (pendingPhotoRotation % 360 !== 0 || pendingPhotoCrop !== "ORIGINAL") {
      try {
        const bitmap = await createImageBitmap(pendingPhoto);
        const canvas = document.createElement("canvas");
        let cropW = bitmap.width, cropH = bitmap.height;
        if (pendingPhotoCrop === "SQUARE") { const s = Math.min(bitmap.width, bitmap.height); cropW = cropH = s; }
        if (pendingPhotoCrop === "PORTRAIT") { cropW = Math.min(bitmap.width, bitmap.height * 4 / 5); cropH = cropW * 5 / 4; if (cropH > bitmap.height) { cropH = bitmap.height; cropW = cropH * 4 / 5; } }
        if (pendingPhotoCrop === "LANDSCAPE") { cropH = Math.min(bitmap.height, bitmap.width * 9 / 16); cropW = cropH * 16 / 9; if (cropW > bitmap.width) { cropW = bitmap.width; cropH = cropW * 9 / 16; } }
        const cropCanvas = document.createElement("canvas"); cropCanvas.width = Math.round(cropW); cropCanvas.height = Math.round(cropH);
        const cropCtx = cropCanvas.getContext("2d"); if (!cropCtx) throw new Error("Unable to edit photo.");
        cropCtx.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, cropW, cropH);
        const rotated = Math.abs(pendingPhotoRotation) % 180 === 90;
        canvas.width = rotated ? Math.round(cropH) : Math.round(cropW); canvas.height = rotated ? Math.round(cropW) : Math.round(cropH);
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Unable to edit photo.");
        ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(pendingPhotoRotation * Math.PI / 180);
        ctx.drawImage(cropCanvas, -cropW / 2, -cropH / 2); bitmap.close();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, pendingPhoto.type || "image/jpeg", 0.92));
        if (blob) file = new File([blob], pendingPhoto.name, { type: pendingPhoto.type || "image/jpeg" });
      } catch { setError("Unable to apply the photo edit."); return; }
    }
    const caption = pendingPhotoCaption.trim();
    cancelPendingPhoto();
    await sendMedia(file, "IMAGE", undefined, caption);
  }
  function shareLocation() {
    setAttachmentsOpen(false);
    if (!navigator.geolocation || mediaBusy) return setError("Location sharing is unavailable.");
    setMediaBusy(true); navigator.geolocation.getCurrentPosition(async (p) => { try { const res = await fetch("/api/messages/" + encodeURIComponent(conversationId), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Shared current location", messageType: "LOCATION", latitude: p.coords.latitude, longitude: p.coords.longitude }) }); const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || "Unable to share location."); await loadConversation(conversationId, true); scrollConversationToBottom(true); } catch (e) { setError(e instanceof Error ? e.message : "Unable to share location."); } finally { setMediaBusy(false); } }, () => { setMediaBusy(false); setError("Unable to get your location."); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  }
  async function toggleRecording() {
    setAttachmentsOpen(false);
    if (recording) return recorderRef.current?.stop();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return setError("Voice recording is not supported.");
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"; const r = new MediaRecorder(stream, { mimeType: mime }); chunksRef.current = []; r.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); }; r.onstop = () => { stream.getTracks().forEach(t => t.stop()); const blob = new Blob(chunksRef.current, { type: mime }); void sendMedia(new File([blob], "voice.webm", { type: mime }), "AUDIO", recordingSeconds * 1000); setRecording(false); setRecordingSeconds(0); }; r.start(); recorderRef.current = r; setRecording(true); setRecordingSeconds(0); const timer = window.setInterval(() => setRecordingSeconds(s => { if (s >= 59) { window.clearInterval(timer); r.stop(); return 60; } return s + 1; }), 1000); } catch { setError("Microphone permission was denied."); }
  }
  async function sendMessage() {
    const clean = content.trim(); if (!conversationId || !clean || sending) return;
    const replyId = replyTo?.id ?? null; setSending(true); setError("");
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: clean, replyToId: replyId }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || "Unable to send message.");
      setContent(""); setReplyTo(null); await loadConversation(conversationId, true); scrollConversationToBottom(true); await markConversationRead(conversationId);
      window.setTimeout(() => { composerRef.current?.focus({ preventScroll: true }); scrollConversationToBottom(true); }, 0);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to send message."); } finally { setSending(false); }
  }

  function handleMessageScroll() {
    const container = messagesContainerRef.current; if (!container || !conversationId) return;
    window.sessionStorage.setItem(scrollStorageKey(conversationId), String(container.scrollTop));
    if (isNearBottom(container) && newMessageCount > 0) { setNewMessageCount(0); void markConversationRead(conversationId); }
  }
  function jumpToNewMessages() { scrollConversationToBottom(true); setNewMessageCount(0); void markConversationRead(conversationId); }

  if (isComposer) return (
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-3xl"><Link href="/messages" className="text-sm text-white/35 hover:text-white"><BackIcon className="h-4 w-4" /> Back to messages</Link><div className="mt-7 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 sm:p-8"><p className="text-xs uppercase tracking-[0.22em] text-red-400/70">New conversation</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Find someone on Revvam</h1><p className="mt-3 text-sm leading-6 text-white/35">Search for a driver or car enthusiast, then send a chat request with a short message.</p><div className="relative mt-7"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username..." className="h-12 w-full rounded-2xl border border-white/[0.10] bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" />{results.length > 0 && <div className="absolute left-0 right-0 top-14 z-20 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b0b0b] shadow-2xl">{results.map((result) => <Link key={result.id} href={`/messages/${encodeURIComponent(result.username)}`} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0 hover:bg-white/[0.04]"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600/10 text-sm font-bold text-red-300">{result.image ? <img src={result.image} alt="" className="h-full w-full object-cover" /> : result.name.charAt(0).toUpperCase()}</span><span><span className="block text-sm font-semibold">{result.name}</span><span className="block text-xs text-white/30">@{result.username}</span></span></Link>)}</div>}</div></div></div><MobileNav /></main>
  );

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-red-500" /></main>;

  return (
    <main className="min-h-screen bg-black px-3 py-4 pb-28 text-white sm:px-6 sm:py-8"><div className="mx-auto flex h-[calc(100dvh-7rem)] min-h-[520px] max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025] shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
      <header className="z-30 flex shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#080808]/95 px-3 py-3.5 backdrop-blur-xl sm:px-6 sm:py-4"><button type="button" onClick={() => router.replace("/messages") } className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-red-400/20 hover:bg-red-500/[0.05] hover:text-white" aria-label="Back to messages"><BackIcon className="h-4 w-4" /></button><Link href={`/users/${encodeURIComponent(user?.username || username)}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left hover:bg-white/[0.03]"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-red-600/10 text-sm font-bold text-red-300">{user?.image ? <img src={user.image} alt={title} className="h-full w-full object-cover" /> : (user?.name || username).charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-[15px] font-bold text-white">{title}</span><span className="block truncate text-xs text-white/35">@{user?.username || username}</span>{presenceLabel(user?.presence) && <span className={"mt-0.5 flex items-center gap-1 text-[10px] " + (user?.presence?.online ? "text-emerald-300/80" : "text-white/25")}><span className={"h-1.5 w-1.5 rounded-full " + (user?.presence?.online ? "bg-emerald-400" : "bg-white/25")} />{presenceLabel(user?.presence)}</span>}</span></Link><div className="hidden items-center gap-2 md:flex"><LiveSocialActions /></div>{chatStatus === "ACCEPTED" && <Link href="/messages/settings" className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold text-white/40 hover:text-white">Receipts</Link>}</header>
{viewerMedia && (() => { const mediaMessages = messages.filter(m => (m.messageType === "IMAGE" || m.messageType === "VIDEO") && !!m.mediaUrl); const currentIndex = Math.max(0, mediaMessages.findIndex(m => m.id === messages[viewerMedia.index]?.id)); const current = mediaMessages[currentIndex]; const move = (delta: number) => { const next = (currentIndex + delta + mediaMessages.length) % mediaMessages.length; const m = mediaMessages[next]; if (m?.mediaUrl) setViewerMedia({ type: m.messageType as "IMAGE" | "VIDEO", url: m.mediaUrl, index: messages.findIndex(x => x.id === m.id) }); }; return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-3" onClick={() => setViewerMedia(null)} onKeyDown={e => { if (e.key === "ArrowLeft") move(-1); if (e.key === "ArrowRight") move(1); if (e.key === "Escape") setViewerMedia(null); }} tabIndex={0} ref={el => el?.focus()}><button type="button" onClick={() => setViewerMedia(null)} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-2 text-white/80"><CloseIcon className="h-4 w-4" /></button>{mediaMessages.length > 1 && <><button type="button" onClick={e => { e.stopPropagation(); move(-1); }} className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-xl text-white/80 sm:block">‹</button><button type="button" onClick={e => { e.stopPropagation(); move(1); }} className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-xl text-white/80 sm:block">›</button></>}<div className="max-h-full max-w-full touch-pan-y" onClick={e => e.stopPropagation()} onTouchStart={e => { (e.currentTarget as HTMLElement).dataset.swipeX = String(e.touches[0].clientX); }} onTouchEnd={e => { const start = Number((e.currentTarget as HTMLElement).dataset.swipeX || e.changedTouches[0].clientX); const dx = e.changedTouches[0].clientX - start; if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1); }}>{current?.messageType === "IMAGE" ? <img src={current.mediaUrl!} alt="Full screen photo" className="max-h-[92vh] max-w-[96vw] object-contain" /> : <video key={current?.id} src={current?.mediaUrl || ""} controls autoPlay playsInline className="max-h-[92vh] max-w-[96vw]" />}</div>{mediaMessages.length > 1 && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/60">{currentIndex + 1} / {mediaMessages.length}</div>}</div> })()}
      {error && <div className="mx-3 mt-3 shrink-0 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300 sm:mx-6">{error}</div>}
      {chatStatus !== "ACCEPTED" ? <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-5 sm:p-10"><div className="w-full max-w-xl rounded-[2rem] border border-red-400/15 bg-red-500/[0.035] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/70">Private chat request</p><h1 className="mt-2 text-2xl font-black">Say hello to {title}</h1><p className="mt-3 text-sm leading-6 text-white/35">Send a short message with your request. They must accept before the private chat opens.</p>{chatStatus === "PENDING_SENT" ? <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-sm font-semibold text-white/70">Request sent</p><p className="mt-2 text-sm text-white/30">Waiting for @{user?.username} to accept.</p></div> : chatStatus === "PENDING_RECEIVED" ? <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/20 p-5"><p className="text-sm font-semibold text-white/70">They already sent you a request.</p><Link href="/profile/notifications" className="mt-4 inline-flex rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-200">Review request</Link></div> : <><textarea value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} maxLength={1000} rows={5} placeholder="Write a message with your request..." className="mt-7 w-full resize-none rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-red-400/30" /><div className="mt-3 flex justify-end"><button type="button" onClick={sendRequest} disabled={requestBusy || !requestMessage.trim()} className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-2.5 text-xs font-semibold text-red-200 disabled:opacity-40">{requestBusy ? "Sending..." : <><MessageIcon className="mr-2 inline-block h-4 w-4" /> Send chat request</>}</button></div></>}</div></div> : <>
        <div ref={messagesContainerRef} onScroll={handleMessageScroll} className="revvam-chat-scroll relative min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-6 sm:px-7">
          {messages.length === 0 ? <p className="py-16 text-center text-sm text-white/25">No messages yet. Say hello.</p> : messages.map((message) => { const mine = message.senderId === currentUserId; const opened = mine && message.opened && receiptVisible; const swiping = swipingId === message.id; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className="group relative max-w-[88%] touch-pan-y" onTouchStart={(event) => startTouchMessage(event, message)} onTouchMove={moveTouchMessage} onTouchEnd={(event) => finishSwipe(event, message)} onTouchCancel={cancelLongPress} onContextMenu={(event) => handleMessageContextMenu(event, message)} style={{ transform: swiping ? "translateX(-8px)" : undefined, transition: "transform 120ms ease" }}><button type="button" onClick={() => chooseReply(message)} aria-label={`Reply to message from @${message.sender.username}`} title="Reply" className={`absolute top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.10] bg-[#0b0b0b] text-xs text-white/45 shadow-lg transition-opacity hover:border-red-400/30 hover:text-red-300 sm:flex sm:opacity-0 sm:group-hover:opacity-100 ${mine ? "-left-9" : "-right-9"}`}><BackIcon className="h-4 w-4 rotate-180" /></button><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${mine ? "rounded-br-md bg-red-600/20 text-white" : "rounded-bl-md bg-white/[0.06] text-white/75"}`}>{message.replyTo && <div className="mb-2 rounded-xl border-l-2 border-red-400/50 bg-black/20 px-3 py-2 text-xs text-white/40"><p className="font-semibold text-red-300/70">Replying to @{message.replyTo.sender.username}</p><p className="mt-0.5 truncate">{message.replyTo.content}</p></div>}{message.messageType === "IMAGE" && message.mediaUrl ? <><button type="button" onClick={() => setViewerMedia({ type: "IMAGE", url: message.mediaUrl!, index: messages.findIndex(m => m.id === message.id) })} className="block max-w-full cursor-zoom-in"><img src={message.mediaUrl} alt="Shared photo" className="max-h-72 max-w-full rounded-xl object-contain" /></button>{message.content && message.content !== "Photo" && <div className="mt-2 whitespace-pre-wrap break-words">{message.content}</div>}</> : message.messageType === "VIDEO" && message.mediaUrl ? <><button type="button" onClick={() => setViewerMedia({ type: "VIDEO", url: message.mediaUrl!, index: messages.findIndex(m => m.id === message.id) })} className="block max-w-full cursor-zoom-in"><video src={message.mediaUrl} playsInline muted className="max-h-72 max-w-full rounded-xl pointer-events-none" /></button>{message.content && message.content !== "Video" && <div className="mt-2 whitespace-pre-wrap break-words">{message.content}</div>}</> : message.messageType === "AUDIO" && message.mediaUrl ? <audio src={message.mediaUrl} controls className="max-w-full" /> : message.messageType === "LOCATION" && message.latitude != null && message.longitude != null ? <a href={"https://www.openstreetmap.org/?mlat=" + message.latitude + "&mlon=" + message.longitude + "#map=17/" + message.latitude + "/" + message.longitude} target="_blank" rel="noreferrer" className="block rounded-xl bg-black/20 px-4 py-3 text-red-200"><span className="inline-flex items-center gap-2"><LocationIcon className="h-4 w-4" /> View shared location</span></a> : <div className="whitespace-pre-wrap break-words">{message.content}</div>}{mine && <div className={`mt-1 text-right text-[9px] font-bold uppercase tracking-[0.14em] ${opened ? "text-red-300/70" : "text-white/25"}`}>{opened ? "Opened" : "Sent"}</div>}</div></div></div>; })}
          <div ref={bottomAnchorRef} aria-hidden="true" className="h-px w-full" />
          {newMessageCount > 0 && <button type="button" onClick={jumpToNewMessages} className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-red-400/25 bg-[#0b0b0b]/95 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_35px_rgba(0,0,0,0.75)] backdrop-blur-xl transition hover:border-red-400/45 hover:bg-red-500/10" aria-label={`Jump to ${newMessageCount} new messages`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] text-white"><BackIcon className="h-4 w-4 rotate-90" /></span><span>{newMessageCount > 99 ? "99+" : newMessageCount} new</span></button>}
        </div>
        {contextMenu && <div ref={contextMenuRef} role="menu" className="fixed z-[2147483647] min-w-[200px] rounded-xl border border-white/[0.12] bg-[#0b0b0b] p-1.5 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}><button type="button" role="menuitem" onClick={() => chooseReply(contextMenu.message)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white"><BackIcon className="h-4 w-4 rotate-180" /> <span>Reply</span></button><button type="button" role="menuitem" disabled={deletingMessageId === contextMenu.message.id} onClick={() => deleteMessage(contextMenu.message, "me")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"><CloseIcon className="h-4 w-4" /> <span>Delete for me</span></button>{contextMenu.message.senderId === currentUserId && Date.now() - new Date(contextMenu.message.createdAt).getTime() <= DELETE_FOR_BOTH_MS && <button type="button" role="menuitem" disabled={deletingMessageId === contextMenu.message.id} onClick={() => deleteMessage(contextMenu.message, "both")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-300 hover:bg-red-500/[0.08] disabled:opacity-50"><CloseIcon className="h-4 w-4" /> <span>Delete for everyone</span></button>}</div>}
<div className="shrink-0 border-t border-white/[0.07] bg-[#080808] p-3 sm:p-5">{pendingPhoto && <div className="mb-3 rounded-2xl border border-red-400/15 bg-black/50 p-3"><div className="flex gap-3"><div className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black"><img src={pendingPhotoUrl} alt="Photo preview" className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${pendingPhotoRotation}deg)` }} /><span className="absolute bottom-2 left-2 rounded-lg bg-black/65 px-2 py-1 text-[9px] text-white/50">Photo preview</span></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">Ready to send</p><button type="button" onClick={cancelPendingPhoto} className="h-8 w-8 rounded-lg text-white/35 hover:bg-white/[0.06] hover:text-white" aria-label="Cancel photo"><CloseIcon className="h-4 w-4" /></button></div><textarea value={pendingPhotoCaption} onChange={e => setPendingPhotoCaption(e.target.value)} placeholder="Write a caption..." rows={2} className="mt-2 min-h-16 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs outline-none placeholder:text-white/20 focus:border-red-400/30"/><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setPendingPhotoCrop("ORIGINAL")} className={`rounded-lg border px-2.5 py-2 text-[9px] font-bold ${pendingPhotoCrop === "ORIGINAL" ? "border-red-400/40 text-red-200" : "border-white/10 text-white/50"}`}>Original</button><button type="button" onClick={() => setPendingPhotoCrop("SQUARE")} className={`rounded-lg border px-2.5 py-2 text-[9px] font-bold ${pendingPhotoCrop === "SQUARE" ? "border-red-400/40 text-red-200" : "border-white/10 text-white/50"}`}>1:1</button><button type="button" onClick={() => setPendingPhotoCrop("PORTRAIT")} className={`rounded-lg border px-2.5 py-2 text-[9px] font-bold ${pendingPhotoCrop === "PORTRAIT" ? "border-red-400/40 text-red-200" : "border-white/10 text-white/50"}`}>4:5</button><button type="button" onClick={() => setPendingPhotoCrop("LANDSCAPE")} className={`rounded-lg border px-2.5 py-2 text-[9px] font-bold ${pendingPhotoCrop === "LANDSCAPE" ? "border-red-400/40 text-red-200" : "border-white/10 text-white/50"}`}>16:9</button><button type="button" onClick={() => setPendingPhotoRotation(r => (r + 90) % 360)} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white/65 hover:text-white">↻ Rotate</button><button type="button" onClick={() => void sendPendingPhoto()} disabled={mediaBusy} className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black disabled:opacity-50">{mediaBusy ? "Sending…" : "Send photo"}</button></div></div></div></div>}{replyTo && <div className="mb-2 flex items-center gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.045] px-3 py-2.5"><span className="h-8 w-0.5 rounded-full bg-red-400" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-300/75">Replying to @{replyTo.sender.username}</p><p className="truncate text-xs text-white/35">{replyTo.content}</p></div><button type="button" onClick={() => { setReplyTo(null); composerRef.current?.focus({ preventScroll: true }); }} className="h-8 w-8 shrink-0 rounded-lg text-white/35 hover:bg-white/[0.05] hover:text-white"><CloseIcon className="h-4 w-4" /></button></div>}<div className="flex items-end gap-2"><div ref={attachmentsRef} className="relative shrink-0"><button type="button" onClick={() => setAttachmentsOpen((open) => !open)} disabled={mediaBusy} aria-expanded={attachmentsOpen} aria-label="Add attachment" className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/[0.03] text-white/65 transition hover:border-red-400/30 hover:bg-red-500/[0.08] hover:text-red-300 ${attachmentsOpen ? "border-red-400/35 bg-red-500/[0.08] text-red-300" : "border-white/[0.10]"}`}><PlusIcon className={`h-5 w-5 transition-transform ${attachmentsOpen ? "rotate-45" : ""}`} /></button>{attachmentsOpen && <div className="absolute bottom-14 left-0 z-40 w-[220px] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b0b0b]/[0.98] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.75)] backdrop-blur-xl"><button type="button" onClick={() => fileInputRef.current?.click()} disabled={mediaBusy || recording} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.10] text-red-300"><ImageIcon className="h-5 w-5" /></span><span><span className="block">Photo or video</span><span className="block text-[10px] font-normal text-white/30">Choose from your device</span></span></button><button type="button" onClick={() => cameraInputRef.current?.click()} disabled={mediaBusy || recording} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.10] text-red-300"><CameraIcon className="h-5 w-5" /></span><span><span className="block">Camera</span><span className="block text-[10px] font-normal text-white/30">Take a photo or video</span></span></button><button type="button" onClick={shareLocation} disabled={mediaBusy || recording} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.10] text-red-300"><LocationIcon className="h-5 w-5" /></span><span><span className="block">Share location</span><span className="block text-[10px] font-normal text-white/30">Send your current position</span></span></button><button type="button" onClick={toggleRecording} disabled={mediaBusy} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/[0.10] text-red-300"><MicIcon className="h-5 w-5" /></span><span><span className="block">{recording ? "Stop recording" : "Voice message"}</span><span className="block text-[10px] font-normal text-white/30">{recording ? recordingSeconds + "s · tap to stop" : "Record up to 1 minute"}</span></span></button></div>}</div><textarea ref={composerRef} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} placeholder="Write a message..." aria-label="Write a message" className="min-h-11 max-h-32 flex-1 resize-none rounded-2xl border border-white/[0.10] bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/30" /><button type="button" onClick={() => void sendMessage()} disabled={sending || !content.trim()} className="min-h-11 shrink-0 rounded-2xl border border-red-400/20 bg-red-500/[0.12] px-5 text-sm font-semibold text-red-300 disabled:opacity-40">{sending ? "..." : <><SendIcon className="mr-2 inline-block h-4 w-4" /> Send</>}</button></div><div className="mt-1.5 flex items-center justify-between gap-3 px-1"><p className="text-[9px] text-white/15"><span className="sm:hidden">Swipe left to reply · Hold a message for options · Enter to send</span><span className="hidden sm:inline">Click <BackIcon className="h-4 w-4 rotate-180" /> or right-click a message for reply/delete options · Enter to send · Shift + Enter for a new line</span></p><span className="shrink-0 text-[9px] text-white/20">{mediaBusy ? "Uploading..." : recording ? recordingSeconds + "s" : "Video max 10MB / 60s"}</span></div><input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={chooseMedia} /><input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={chooseMedia} /></div>
      </>}
    </div><MobileNav /></main>
  );
}
