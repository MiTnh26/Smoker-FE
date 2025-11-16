import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Phone, Video, Info, MoreVertical, Reply, Smile, Search, CheckCheck } from "lucide-react";
import { cn } from "../../../utils/cn";
import MessagesPanel from "../../../components/layout/common/MessagesPanel";
import MessageList from "../components/MessageList";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import useChatSocket from "../../../api/useChatSocket";
import Composer from "../components/Composer";
import { getEntityMapFromSession } from "../../../utils/sessionHelper";

const themeVars = {
  background: "rgb(var(--background))",
  backgroundSoft: "rgb(var(--background) / 0.92)",
  card: "rgb(var(--card))",
  cardSoft: "rgb(var(--card) / 0.94)",
  border: "rgb(var(--border))",
  borderSoft: "rgb(var(--border) / 0.45)",
  borderStrong: "rgb(var(--border) / 0.75)",
  primary: "rgb(var(--primary))",
  primarySoft: "rgb(var(--primary) / 0.18)",
  foreground: "rgb(var(--foreground))",
  muted: "rgb(var(--muted))",
  mutedForeground: "rgb(var(--muted-foreground))",
  primaryForeground: "rgb(var(--primary-foreground))",
};

function ConversationView({ chat, onBack }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [other, setOther] = useState({ name: chat?.name, avatar: chat?.avatar });
  const bodyRef = useRef(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const linkPreviewCacheRef = useRef(new Map());
  const [linkPreviewMap, setLinkPreviewMap] = useState({});

  // Reset header info and paging when switching chats
  useEffect(() => {
    setOther({ name: chat?.name, avatar: chat?.avatar });
    setMessages([]);
    setHasMore(true);
  }, [chat?.id, chat?.name, chat?.avatar]);

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const active = session?.activeEntity || {};
      const entities = session?.entities || [];
      const id =
        active.EntityAccountId ||
        active.entityAccountId ||
        entities.find(e => String(e.id) === String(active.id) && e.type === active.type)?.EntityAccountId ||
        entities[0]?.EntityAccountId ||
        null;
      setCurrentUserId(id);
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  const getTimestamp = (m) => {
    return (
      m?.createdAt ||
      m?.CreatedAt ||
      m?.timestamp ||
      m?.Timestamp ||
      m?.["Thời Gian"] ||
      0
    );
  };

  const PAGE_SIZE = 50;

  const loadMessages = useCallback(async () => {
    if (!chat?.id) return;
    const res = await messageApi.getMessages(chat.id, { limit: PAGE_SIZE });
    const arr = res?.data?.data || res?.data || [];
    const normalized = Array.isArray(arr) ? arr : [];
    normalized.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    setMessages(normalized);
    setHasMore(normalized.length >= PAGE_SIZE);
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 50);
  }, [chat?.id]);

  const loadMore = useCallback(async () => {
    if (!chat?.id || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    const before = getTimestamp(oldest);
    const res = await messageApi.getMessages(chat.id, { before, limit: PAGE_SIZE });
    const arr = res?.data?.data || res?.data || [];
    const more = Array.isArray(arr) ? arr : [];
    more.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    setMessages((prev) => [...more, ...prev]);
    if (more.length < PAGE_SIZE) setHasMore(false);
  }, [chat?.id, hasMore, messages]);

  useEffect(() => {
    loadMessages();
    if (chat?.entityId) {
      const map = getEntityMapFromSession();
      const cached = map.get(String(chat.entityId).toLowerCase());
      if (cached) {
        setOther({
          name: cached.name || chat.name,
          avatar: cached.avatar || chat.avatar,
        });
        return;
      }
      publicProfileApi.getByEntityId(chat.entityId).then(res => {
        const p = res?.data?.data || res?.data || {};
        setOther({
          name: p.name || p.BarName || p.BusinessName || chat.name,
          avatar: p.avatar || p.Avatar || chat.avatar,
        });
      }).catch(() => {});
    }
  }, [chat?.id, chat?.entityId, chat?.name, chat?.avatar, loadMessages]);

  const { socket } = useChatSocket(() => {
    if (!chat?.id) return;
    loadMessages();
    messageApi.markMessagesRead(chat.id);
  });

  useEffect(() => {
    if (!socket || !chat?.id) return;
    const join = () => socket.emit("join_conversation", chat.id);
    if (socket.connected) join();
    socket.on("connect", join);
    const onTypingStart = (p) => {
      if (String(p?.convId) === String(chat.id)) setIsTyping(true);
    };
    const onTypingStop = (p) => {
      if (String(p?.convId) === String(chat.id)) setIsTyping(false);
    };
    const onPresence = (p) => {
      if (!p) return;
      setPresence({ online: !!p.online, lastSeen: p.lastSeen || null });
    };
    // message ack -> update pending to sent
    const onAck = (payload) => {
      if (!payload) return;
      const { clientId, messageId, status } = payload;
      setMessages((prev) =>
        prev.map((m) => {
          if (clientId && m.clientId === clientId) {
            return { ...m, id: messageId || m.id, _status: status || "sent" };
          }
          return m;
        })
      );
    };
    // read receipt -> mark my messages up to id as read
    const onRead = (payload) => {
      const lastId = payload?.messageId || payload?.lastReadId;
      if (!lastId) return;
      setMessages((prev) =>
        prev.map((m) => {
          const isMine = String(m.senderId || "").toLowerCase().trim() === String(currentUserId || "").toLowerCase().trim();
          if (!isMine) return m;
          // naive: mark all as read when event received
          return { ...m, _status: "read" };
        })
      );
    };
    socket.on("message:ack", onAck);
    socket.on("message:read", onRead);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("presence:update", onPresence);
    // reaction updates from other devices/users
    const onReaction = (p) => {
      const mid = p?.messageId || p?.id;
      const emoji = p?.emoji;
      if (!mid || !emoji) return;
      setMessages((prev) =>
        prev.map((m) => {
          const id = m.id || m._id;
          if (String(id) !== String(mid)) return m;
          const count = (m.reactions?.[emoji] || 0) + 1;
          return { ...m, reactions: { ...(m.reactions || {}), [emoji]: count } };
        })
      );
    };
    socket.on("message:reaction", onReaction);
    return () => {
      socket.off("connect", join);
      socket.off("message:ack", onAck);
      socket.off("message:read", onRead);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("presence:update", onPresence);
      socket.off("message:reaction", onReaction);
      if (socket.connected) socket.emit("leave_conversation", chat.id);
    };
  }, [socket, chat?.id]);

  const handleSend = async () => {
    if (!message.trim() || !currentUserId || !chat?.id) return;
    await messageApi.sendMessage(chat.id, message.trim(), "text", currentUserId);
    setMessage("");
    loadMessages();
  };
  const handleSendFromComposer = async (text, opts = {}) => {
    if (!text.trim() || !currentUserId || !chat?.id) return;
    // derive entity context from session
    let entityType = null;
    let entityId = null;
    let entityAccountIdForChat = currentUserId;
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const ae = session?.activeEntity || {};
      const raw = String(ae?.role || ae?.type || "").toLowerCase();
      if (raw === "bar") entityType = "BarPage";
      else if (raw === "dj" || raw === "dancer" || raw === "business") entityType = "Business";
      else entityType = "Account";
      entityId = ae?.id || null; // e.g., BarPageId
      entityAccountIdForChat = ae?.EntityAccountId || ae?.entityAccountId || currentUserId;
    } catch {}
    // Debug log
    try {
      // eslint-disable-next-line no-console
      console.log("[Messages] send text payload", {
        conversationId: chat?.id,
        contentPreview: text.slice(0, 50),
        senderEntityAccountId: entityAccountIdForChat,
        entityType,
        entityId,
        replyToId: opts?.replyToId,
      });
    } catch {}
    // optimistic pending message
    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pending = {
      id: clientId,
      clientId,
      content: text.trim(),
      type: "text",
      senderId: currentUserId,
      _status: "pending",
      createdAt: Date.now(),
      replyToId: opts?.replyToId,
    };
    setMessages((prev) => [...prev, pending]);
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 0);
    try {
      await messageApi.sendMessage(
        chat.id,
        text.trim(),
        "text",
        entityAccountIdForChat,     // senderEntityAccountId (EntityAccountId)
        entityType,        // 'BarPage' | 'Business' | 'Account'
        entityId,          // e.g., BarPageId
        { clientId, replyToId: opts?.replyToId }
      );
    } finally {
      // refresh from server (ack + persisted ids)
      loadMessages();
    }
    setReplyTarget(null);
  };
  const handleSendMedia = async (files, opts = {}) => {
    if (!files?.length || !currentUserId || !chat?.id) return;
    // derive entity context
    let entityType = null;
    let entityId = null;
    let entityAccountIdForChat = currentUserId;
    try {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      const ae = session?.activeEntity || {};
      const raw = String(ae?.role || ae?.type || "").toLowerCase();
      if (raw === "bar") entityType = "BarPage";
      else if (raw === "dj" || raw === "dancer" || raw === "business") entityType = "Business";
      else entityType = "Account";
      entityId = ae?.id || null;
      entityAccountIdForChat = ae?.EntityAccountId || ae?.entityAccountId || currentUserId;
    } catch {}
    try {
      // eslint-disable-next-line no-console
      console.log("[Messages] send media payload", {
        conversationId: chat?.id,
        filesCount: files?.length || 0,
        senderEntityAccountId: entityAccountIdForChat,
        entityType,
        entityId,
        replyToId: opts?.replyToId,
      });
    } catch {}
    for (const file of files) {
      try {
        let uploaded = null;
        if (messageApi.uploadMedia) {
          uploaded = await messageApi.uploadMedia(file);
        } else {
          // fallback generic upload
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/upload", { method: "POST", body: form });
          uploaded = await res.json();
        }
        const filePayload = {
          url: uploaded?.url || uploaded?.data?.url,
          name: file.name,
          size: file.size,
          type: file.type,
        };
        await messageApi.sendMessage(
          chat.id,
          JSON.stringify(filePayload),
          file.type.startsWith("image/") ? "image" : "file",
          entityAccountIdForChat,
          entityType,
          entityId,
          { replyToId: opts?.replyToId }
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Upload/send file failed", e);
      }
    }
    loadMessages();
    setReplyTarget(null);
  };

  const me = currentUserId ? String(currentUserId).toLowerCase().trim() : "";
  const getInitial = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name[0].toUpperCase();
  };
  const [isTyping, setIsTyping] = useState(false);
  const [presence, setPresence] = useState({ online: false, lastSeen: null });
  const [messageQuery, setMessageQuery] = useState("");

  const formatTimestampLabel = useCallback((value) => {
    try {
      const date = new Date(value);
      return date.toLocaleString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }, []);

  const shouldShowTimestamp = (index, list = messages) => {
    if (index === 0) return true;
    const current = getTimestamp(list[index]);
    const prev = getTimestamp(list[index - 1]);
    return current - prev > 30 * 60 * 1000 || new Date(current).getDate() !== new Date(prev).getDate();
  };

  const displayMessages = useMemo(() => {
    const q = messageQuery.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((msg) => {
      const text = (msg["Nội Dung Tin Nhắn"] || msg.content || msg.message || "").toString().toLowerCase();
      return text.includes(q);
    });
  }, [messages, messageQuery]);

  const messageMap = useMemo(() => {
    const map = new Map();
    for (const msg of messages) {
      const key = String(msg.id || msg._id || "");
      if (key) map.set(key, msg);
    }
    return map;
  }, [messages]);

  const getSenderKey = (msg) => String(msg["Người Gửi"] || msg.senderId || "").toLowerCase().trim();

  return (
    <div
      className="flex h-[calc(100vh-144px)] flex-1 flex-col rounded-[32px] shadow-[0_40px_120px_rgba(15,23,42,0.12)]"
      style={{
        background: themeVars.cardSoft,
        border: `1px solid ${themeVars.borderSoft}`,
      }}
    >
      {/* Header inline */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3"
        style={{
          borderBottom: `1px solid ${themeVars.borderSoft}`,
          background: `linear-gradient(90deg, ${themeVars.card} 0%, ${themeVars.backgroundSoft} 100%)`,
        }}
      >
        {onBack && (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm transition lg:hidden"
            onClick={onBack}
            aria-label={t('action.back', { defaultValue: 'Quay lại' })}
            style={{
              border: `1px solid ${themeVars.borderStrong}`,
              color: themeVars.foreground,
              background: themeVars.card,
            }}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div
          className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full text-center font-semibold"
          style={{
            background: `linear-gradient(135deg, ${themeVars.primary} 0%, ${themeVars.primarySoft} 100%)`,
            color: themeVars.primaryForeground,
          }}
        >
          {other?.avatar ? <img src={other.avatar} alt={other?.name} className="h-full w-full object-cover" /> : getInitial(other?.name)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="text-[15px] font-semibold" style={{ color: themeVars.foreground }}>
            {other?.name || chat?.name}
          </div>
          <div className="text-xs" style={{ color: themeVars.mutedForeground }}>
            {isTyping ? "Đang nhập..." : presence.online ? "Đang hoạt động" : presence.lastSeen ? `Hoạt động ${new Date(presence.lastSeen).toLocaleString()}` : ""}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2" style={{ color: themeVars.mutedForeground }}>
          {[
            { id: "phone", label: "Call", Icon: Phone },
            { id: "video", label: "Video", Icon: Video },
            { id: "info", label: "Info", Icon: Info }
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
              title={label}
              style={{
                border: `1px solid ${themeVars.borderStrong}`,
                background: themeVars.card,
                color: themeVars.mutedForeground,
              }}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex flex-1 items-center gap-2 rounded-full border px-3 py-2"
            style={{ borderColor: themeVars.borderSoft, background: themeVars.card }}
            >
            <Search size={16} style={{ color: themeVars.mutedForeground }} />
            <input
              className="flex-1 border-none bg-transparent text-sm outline-none"
              placeholder={t("messages.searchPlaceholder")}
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button className="rounded-full border px-3 py-1" style={{ borderColor: themeVars.borderSoft }}>
              {t("messages.tabAll")}
            </button>
            <button className="rounded-full border px-3 py-1" style={{ borderColor: themeVars.borderSoft }}>
              {t("messages.tabUnread")}
            </button>
          </div>
        </div>
      </div>
      {/* Body */}
      <div
        ref={bodyRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-4"
        style={{ background: themeVars.backgroundSoft }}
      >
        <MessageList
          containerRef={bodyRef}
          messages={displayMessages}
          hasMore={hasMore}
          onLoadMore={loadMore}
          renderItem={(m, i) => {
            const sender = getSenderKey(m);
            const isMine = me && sender === me;
            const text = m["Nội Dung Tin Nhắn"] || m.content || m.message || "";
            const status = m._status || m.status; // pending | sent | delivered | read
            // link preview
            const urlMatch = typeof text === "string" ? text.match(/https?:\/\/[^\s]+/i) : null;
            const url = urlMatch?.[0];
            if (url && !linkPreviewCacheRef.current.has(url)) {
              linkPreviewCacheRef.current.set(url, true);
              (async () => {
                try {
                  let preview = null;
                  if (messageApi.getLinkPreview) {
                    const res = await messageApi.getLinkPreview(url);
                    preview = res?.data?.data || res?.data;
                  } else {
                    const res = await fetch(`/api/link/preview?url=${encodeURIComponent(url)}`);
                    preview = await res.json();
                  }
                  setLinkPreviewMap((prev) => ({ ...prev, [url]: preview }));
                } catch {}
              })();
            }
            // detect special content
            let contentNode = null;
            let imageUrl = null;
            if (typeof text === "string") {
              const storyImg = text.match(/\[STORY_IMAGE:?\s*(https?:\/\/[^\]\s]+)[^\]]*\]/i);
              if (storyImg?.[1]) imageUrl = storyImg[1];
              // fallback: JSON payload { url, type }
              if (!imageUrl) {
                try {
                  const parsed = JSON.parse(text);
                  if (parsed && parsed.url && (/image\//.test(parsed.type || "") || parsed.type === "image")) {
                    imageUrl = parsed.url;
                  }
                } catch {}
              }
            }
            if (imageUrl) {
              contentNode = (
                <a href={imageUrl} target="_blank" rel="noreferrer" className="block no-underline">
                  <img
                    src={imageUrl}
                    alt="image"
                    className="max-h-[360px] max-w-[280px] rounded-2xl object-cover"
                    loading="lazy"
                  />
                </a>
              );
            } else {
              // linkify plain text urls
              const parts = String(text || "").split(/(https?:\/\/[^\s]+)/gi);
              contentNode = (
                <span>
                  {parts.map((part, idx) =>
                    /^https?:\/\//i.test(part) ? (
                      <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-primary underline">
                        {part}
                      </a>
                    ) : (
                      <React.Fragment key={idx}>{part}</React.Fragment>
                    )
                  )}
                </span>
              );
            }
            const actionIcons = [
              { label: t("action.moreOptions") || "More", Icon: MoreVertical },
              { label: t("comment.reply") || "Reply", Icon: Reply },
              { label: t("action.react") || "React", Icon: Smile }
            ];
            const reactionChoices = ["👍","❤️","😂","😮","😢","😡"];
            const handleReactionClick = async (emoji) => {
              const mid = m.id || m._id;
              setMessages((prev) =>
                prev.map((mm) => {
                  if ((mm.id || mm._id) !== mid) return mm;
                  const currentCount = mm.reactions?.[emoji] || 0;
                  return {
                    ...mm,
                    reactions: {
                      ...(mm.reactions || {}),
                      [emoji]: currentCount + 1
                    }
                  };
                })
              );
              try {
                if (messageApi.reactMessage) {
                  await messageApi.reactMessage(mid, emoji);
                }
                if (socket && chat?.id) {
                  socket.emit("message:reaction", { convId: chat.id, messageId: mid, emoji });
                }
              } catch (error) {
                console.error("React message failed", error);
              }
            };
            const replyPreview = (() => {
              if (!m.replyToId) return null;
              const ref = messageMap.get(String(m.replyToId));
              if (!ref) return null;
              const refText = (ref["Nội Dung Tin Nhắn"] || ref.content || ref.message || "").toString();
              const refSender = getSenderKey(ref) === me ? t("messages.you") || "Bạn" : (ref.authorName || other?.name || "User");
            return (
              <div
                  className="mb-2 rounded-lg border px-3 py-1 text-xs"
                  style={{ borderColor: themeVars.borderSoft, background: isMine ? "rgba(255,255,255,0.2)" : themeVars.cardSoft }}
                >
                  <div className="font-semibold">{refSender}</div>
                  <div className="line-clamp-2 opacity-80">{refText || t("messages.attachment") || "Đính kèm"}</div>
                </div>
              );
            })();
            const bubble = (
              <div
                key={`bubble-${i}`}
                className={cn(
                  "group relative max-w-[260px] break-words rounded-2xl px-3 py-1.5 text-[14px] leading-[1.35] font-medium shadow-sm sm:max-w-[320px]",
                  isMine ? "rounded-br-md" : "rounded-bl-md border"
                )}
                onClick={() => {
                  setReplyTarget({
                    id: m.id || m._id,
                    text,
                    preview: text?.slice(0, 60),
                  });
                }}
                style={
                  isMine
                    ? {
                        background: `linear-gradient(135deg, ${themeVars.primary} 0%, ${themeVars.primarySoft} 100%)`,
                        color: themeVars.primaryForeground,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                      }
                    : {
                        background: themeVars.card,
                        color: themeVars.foreground,
                        borderColor: themeVars.borderSoft,
                      }
                }
              >
                {replyPreview}
                <div className="flex items-start gap-2">
                  {contentNode}
                </div>
                <div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-lg shadow-md group-hover:flex">
                  {reactionChoices.map((emoji) => (
                        <button
                      key={emoji}
                      className="pointer-events-auto text-base"
                          onClick={(ev) => {
                            ev.stopPropagation();
                        handleReactionClick(emoji);
                          }}
                        >
                      {emoji}
                        </button>
                      ))}
                </div>
                {url && linkPreviewMap[url] && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block rounded-md border p-2 no-underline"
                    style={{
                      borderColor: themeVars.borderSoft,
                      background: themeVars.background,
                      color: themeVars.foreground,
                    }}
                  >
                    <div className="text-sm font-semibold">{linkPreviewMap[url]?.title || url}</div>
                    {linkPreviewMap[url]?.description && <div className="text-xs" style={{ color: themeVars.mutedForeground }}>{linkPreviewMap[url]?.description}</div>}
                  </a>
                )}
                {!!m.reactions && (
                  <div className="mt-1 flex gap-1 text-xs">
                    <div
                      className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5"
                      style={{ color: isMine ? "rgba(255,255,255,0.9)" : themeVars.foreground }}
                    >
                    {Object.entries(m.reactions).map(([k,v]) => (
                        <span key={k} className="flex items-center gap-0.5 text-sm">
                          {k} {v}
                        </span>
                    ))}
                  </div>
                  </div>
                )}
                <div
                  className={cn(
                    "mt-1 flex text-xs opacity-0 transition group-hover:opacity-100",
                    isMine ? "justify-end" : "justify-start"
                  )}
                  style={{ color: isMine ? "rgba(255,255,255,0.85)" : themeVars.mutedForeground }}
                >
                  <span>{new Date(getTimestamp(m)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {isMine && (
                    <span className="ml-2 flex items-center gap-1 select-none">
                      <CheckCheck size={14} />
                      {status === "read" ? t("messages.seen") || "Đã xem" : status === "delivered" ? t("messages.delivered") || "Đã gửi" : status === "sent" ? "✓" : status === "pending" ? "…" : ""}
                  </span>
                )}
              </div>
              </div>
            );
            const nextSender = displayMessages[i + 1] ? getSenderKey(displayMessages[i + 1]) : null;
            const showAvatar = !isMine && sender !== nextSender;
            return (
              <React.Fragment key={i}>
                {shouldShowTimestamp(i, displayMessages) && (
                  <div className="mb-3 flex w-full justify-center">
                    <span
                      className="rounded-full px-4 py-1 text-xs font-medium"
                      style={{ background: themeVars.card, color: themeVars.mutedForeground }}
                    >
                      {formatTimestampLabel(getTimestamp(m))}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "group/message flex items-end gap-2",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMine && showAvatar && (
                    <img
                      src={m.authorAvatar || other?.avatar}
                      alt={m.authorName || other?.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  {!isMine && !showAvatar && (
                    <div className="h-8 w-8 flex-shrink-0" />
                  )}
                  {isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: themeVars.borderSoft, color: themeVars.mutedForeground, background: themeVars.card }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                  {bubble}
                  {!isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: themeVars.borderSoft, color: themeVars.mutedForeground, background: themeVars.card }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label}>
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          }}
        />
      </div>
      {/* Input */}
      <div
        className="px-3"
        style={{
          borderTop: `1px solid ${themeVars.borderSoft}`,
          background: themeVars.card,
        }}
      >
        <Composer
          convId={chat?.id}
          placeholder={t('input.messagePlaceholder')}
          onSend={handleSendFromComposer}
          onSendMedia={handleSendMedia}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onTyping={(state) => {
            if (!socket || !chat?.id) return;
            if (state === "start") socket.emit("typing:start", { convId: chat.id });
            else socket.emit("typing:stop", { convId: chat.id });
          }}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    // Allow MessagesPanel to open a chat in the right pane
    // eslint-disable-next-line no-undef
    window.__openChat = (contact) => setSelectedChat(contact);
    return () => {
      // eslint-disable-next-line no-undef
      delete window.__openChat;
    };
  }, []);

  return (
    <div
      className="min-h-[calc(100vh-80px)] px-3 py-4 sm:px-6"
      style={{ background: themeVars.background }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div
          className={cn(
            "h-[calc(100vh-144px)] overflow-hidden rounded-[32px] shadow-[0_30px_120px_rgba(15,23,42,0.15)] backdrop-blur",
            selectedChat ? "hidden lg:block" : "block"
          )}
          style={{
            border: `1px solid ${themeVars.borderSoft}`,
            background: themeVars.cardSoft,
          }}
        >
          <MessagesPanel
            onClose={() => {}}
            onUnreadCountChange={() => {}}
            selectedId={selectedChat?.id}
          />
        </div>
        <div
          className={cn(
            "w-full",
            selectedChat ? "block" : "hidden",
            "lg:block"
          )}
        >
        {selectedChat ? (
            <ConversationView chat={selectedChat} onBack={() => setSelectedChat(null)} />
        ) : (
          <div
            className={cn(
                "hidden h-[calc(100vh-176px)] rounded-lg border-[0.5px] border-dashed border-border/30 lg:flex",
                "bg-card items-center justify-center text-sm text-muted-foreground"
            )}
          >
            {t('messages.selectConversation')}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}


