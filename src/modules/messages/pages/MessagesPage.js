import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import MessagesPanel from "../../../components/layout/common/MessagesPanel";
import MessageList from "../components/MessageList";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import useChatSocket from "../../../api/useChatSocket";
import Composer from "../components/Composer";
import { getEntityMapFromSession } from "../../../utils/sessionHelper";

function ConversationView({ chat }) {
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

  return (
    <div className="flex h-[calc(100vh-144px)] flex-1 flex-col rounded-lg border-[0.5px] border-border/20 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Header inline */}
      <div className="flex items-center gap-3 border-b border-border/30 bg-muted px-4 py-3">
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-center font-semibold text-primary-foreground">
          {other?.avatar ? <img src={other.avatar} alt={other?.name} className="h-full w-full object-cover" /> : getInitial(other?.name)}
        </div>
        <div className="flex flex-col">
          <div className="text-[15px] font-semibold text-foreground">{other?.name || chat?.name}</div>
          <div className="text-xs text-muted-foreground">
            {isTyping ? "Đang nhập..." : presence.online ? "Đang hoạt động" : presence.lastSeen ? `Hoạt động ${new Date(presence.lastSeen).toLocaleString()}` : ""}
          </div>
        </div>
        <div className="ml-auto">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              aria-label="Search in conversation"
              placeholder={t('action.search', { defaultValue: 'Search' })}
              className="h-9 w-[220px] rounded-full border border-border/30 bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-border/60 focus:ring-0"
              onChange={(e) => {
                const q = e.target.value.trim().toLowerCase();
                if (!q) {
                  if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
                  return;
                }
                const idx = messages.findIndex((m) => {
                  const text = (m['Nội Dung Tin Nhắn'] || m.content || m.message || '').toString().toLowerCase();
                  return text.includes(q);
                });
                if (idx >= 0) {
                  // scroll to approx position
                  if (bodyRef.current) {
                    const ratio = idx / Math.max(1, messages.length - 1);
                    bodyRef.current.scrollTop = ratio * (bodyRef.current.scrollHeight - bodyRef.current.clientHeight);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      {/* Body */}
      <div ref={bodyRef} className="flex flex-1 flex-col overflow-y-auto bg-background">
        <MessageList
          containerRef={bodyRef}
          messages={messages}
          hasMore={hasMore}
          onLoadMore={loadMore}
          renderItem={(m, i) => {
            const sender = String(m["Người Gửi"] || m.senderId || "").toLowerCase().trim();
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
            return (
              <div
                key={i}
                className={cn(
                  "max-w-[60%] break-words rounded-[16px] px-3 py-2 text-[15px] leading-[1.35] font-medium",
                  isMine ? "self-end rounded-br-sm bg-primary text-primary-foreground" : "self-start rounded-bl-sm bg-muted text-card-foreground"
                )}
                onClick={() => {
                  setReplyTarget({
                    id: m.id || m._id,
                    text,
                    preview: text?.slice(0, 60),
                  });
                }}
              >
                <div className="flex items-center gap-2">
                  {contentNode}
                  <div className="relative group">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" title="React">😊</button>
                    <div className="absolute -top-10 left-0 hidden rounded-md border border-border/30 bg-card px-2 py-1 text-base shadow group-hover:block">
                      {["👍","❤️","😂","😮","😢","😡"].map((e) => (
                        <button
                          key={e}
                          className="px-1"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const mid = m.id || m._id;
                            setMessages((prev) => prev.map(mm => mm === m ? { ...mm, reactions: { ...(mm.reactions||{}), [e]: (mm.reactions?.[e]||0)+1 } } : mm));
                            if (messageApi.reactMessage) {
                              messageApi.reactMessage(mid, e).catch(()=>{});
                            }
                            if (socket && chat?.id) {
                              try {
                                socket.emit("message:reaction", { convId: chat.id, messageId: mid, emoji: e });
                              } catch {}
                            }
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {url && linkPreviewMap[url] && (
                  <a href={url} target="_blank" rel="noreferrer" className="mt-2 block rounded-md border border-border/30 bg-background p-2 no-underline">
                    <div className="text-sm font-semibold">{linkPreviewMap[url]?.title || url}</div>
                    {linkPreviewMap[url]?.description && <div className="text-xs text-muted-foreground">{linkPreviewMap[url]?.description}</div>}
                  </a>
                )}
                {!!m.reactions && (
                  <div className="mt-1 flex gap-1 text-xs opacity-90">
                    {Object.entries(m.reactions).map(([k,v]) => (
                      <span key={k} className="rounded bg-black/10 px-1">{k} {v}</span>
                    ))}
                  </div>
                )}
                {isMine && (
                  <span className="ml-2 select-none text-xs opacity-80">
                    {status === "read" ? "✓✓" : status === "delivered" ? "✓✓" : status === "sent" ? "✓" : status === "pending" ? "…" : ""}
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>
      {/* Input */}
      <div className="border-t border-border/30 bg-card">
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
    <div className="mx-auto max-w-[1400px] px-4 py-2.5">
      <div className="grid grid-cols-[360px_1fr] gap-4">
        <div className="h-[calc(100vh-144px)] overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <MessagesPanel onClose={() => {}} onUnreadCountChange={() => {}} />
        </div>
        {selectedChat ? (
          <ConversationView chat={selectedChat} />
        ) : (
          <div
            className={cn(
              "h-[calc(100vh-176px)] rounded-lg border-[0.5px] border-dashed border-border/30",
              "bg-card flex items-center justify-center text-sm text-muted-foreground"
            )}
          >
            {t('messages.selectConversation')}
          </div>
        )}
      </div>
    </div>
  );
}


