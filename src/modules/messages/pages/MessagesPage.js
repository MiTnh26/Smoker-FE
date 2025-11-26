import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Reply, Search, FileText } from "lucide-react";
import { cn } from "../../../utils/cn";
import MessagesPanel from "../../../components/layout/common/MessagesPanel";
import MessageList from "../components/MessageList";
import messageApi from "../../../api/messageApi";
import publicProfileApi from "../../../api/publicProfileApi";
import useChatSocket from "../../../api/useChatSocket";
import Composer from "../components/Composer";
import { getEntityMapFromSession } from "../../../utils/sessionHelper";
import NotificationToPostModal from "../../feeds/components/modals/NotificationToPostModal";
import { getPostById } from "../../../api/postApi";

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
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [postPreviews, setPostPreviews] = useState(new Map()); // Store post previews by postId

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
    // Use English fields only
    if (m?.createdAt) {
      return typeof m.createdAt === 'number' ? m.createdAt : new Date(m.createdAt).getTime();
    }
    return m?.timestamp || 0;
  };

  const PAGE_SIZE = 50;

  const loadMessages = useCallback(async () => {
    if (!chat?.id) return;
    const res = await messageApi.getMessages(chat.id, { limit: PAGE_SIZE, offset: 0 });
    const arr = res?.data?.data || res?.data || [];
    const normalized = Array.isArray(arr) ? arr : [];
    // Normalize message structure to use English fields only
    const normalizedMessages = normalized.map(m => {
      const sharedPost = m.shared_post || m.sharedPost || null;
      const sharedPostId = sharedPost?._id || m.shared_post_id || m.sharedPostId || null;
      return {
        ...m,
        id: m._id || m.id || m.messageId,
        content: m.content || "",
        senderId: m.sender_id || m.senderId || "",
        createdAt: m.createdAt || m.timestamp || new Date(),
        messageType: m.message_type || m.messageType || "text",
        sharedPost,
        sharedPostId,
        isPostShare: m.is_post_share || m.isPostShare || !!sharedPostId,
      };
    });
    normalizedMessages.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    setMessages(normalizedMessages);
    setHasMore(res?.data?.pagination?.hasMore || normalizedMessages.length >= PAGE_SIZE);
    setTimeout(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 50);
    // Mark as read and refresh message badge
    try {
      if (currentUserId) await messageApi.markMessagesRead(chat.id, currentUserId);
      if (typeof window !== "undefined") window.dispatchEvent(new Event("messageRefresh"));
    } catch {}
  }, [chat?.id]);

  const loadMore = useCallback(async () => {
    if (!chat?.id || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    const beforeId = oldest?._id || oldest?.id;
    const res = await messageApi.getMessages(chat.id, { before: beforeId, limit: PAGE_SIZE });
    const arr = res?.data?.data || res?.data || [];
    const more = Array.isArray(arr) ? arr : [];
    // Normalize message structure to use English fields only
    const normalizedMore = more.map(m => {
      const sharedPost = m.shared_post || m.sharedPost || null;
      const sharedPostId = sharedPost?._id || m.shared_post_id || m.sharedPostId || null;
      return {
        ...m,
        id: m._id || m.id || m.messageId,
        content: m.content || "",
        senderId: m.sender_id || m.senderId || "",
        createdAt: m.createdAt || m.timestamp || new Date(),
        messageType: m.message_type || m.messageType || "text",
        sharedPost,
        sharedPostId,
        isPostShare: m.is_post_share || m.isPostShare || !!sharedPostId,
      };
    });
    normalizedMore.sort((a, b) => getTimestamp(a) - getTimestamp(b));
    setMessages((prev) => [...normalizedMore, ...prev]);
    if (normalizedMore.length < PAGE_SIZE) setHasMore(false);
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
    if (currentUserId) messageApi.markMessagesRead(chat.id, currentUserId)
      .then(() => { try { (typeof window !== "undefined") && window.dispatchEvent(new Event("messageRefresh")); } catch (e) {} })
      .catch(() => {});
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
    socket.on("message:ack", onAck);
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
      const text = (msg.content || msg.message || "").toString().toLowerCase();
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

  const getSenderKey = (msg) => String(msg.sender_id || msg.senderId || "").toLowerCase().trim();

  const getPostUrl = useCallback((postId) => {
    if (!postId) return null;
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/posts/${postId}`;
    }
    return `/posts/${postId}`;
  }, []);

  // Fetch post preview when post link is detected
  const fetchPostPreview = useCallback(async (postId) => {
    if (!postId || postPreviews.has(postId)) return;
    
    try {
      const response = await getPostById(postId, { includeMedias: true });
      const postData = response?.success && response.data ? response.data : (response?._id ? response : null);
      
      if (postData) {
        setPostPreviews(prev => {
          const newMap = new Map(prev);
          newMap.set(postId, {
            id: postData._id || postData.id,
            content: postData.content || postData.title || "",
            authorName: postData.authorName || postData.author?.userName || postData.account?.userName || "Người dùng",
            authorAvatar: postData.authorAvatar || postData.author?.avatar || postData.account?.avatar || null,
            previewImage: postData.medias?.images?.[0]?.url || postData.medias?.videos?.[0]?.thumbnail || null,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.warn('[MessagesPage] Failed to fetch post preview:', error);
    }
  }, [postPreviews]);

  // Render post preview card
  const renderPostPreviewCard = useCallback((postId, isMine) => {
    const preview = postPreviews.get(postId);
    if (!preview) {
      // Fetch preview if not loaded
      fetchPostPreview(postId);
      return null;
    }

    const summary = preview.content && preview.content.length > 100
      ? `${preview.content.slice(0, 100)}…`
      : preview.content || "Bài viết";

    return (
      <div
        className="mt-2 flex w-full gap-3 overflow-hidden rounded-xl border p-2.5"
        style={{
          borderColor: isMine ? "rgba(255,255,255,0.25)" : "rgb(var(--border))",
          background: isMine ? "rgba(255,255,255,0.1)" : "rgb(var(--card))",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPostId(postId);
          setPostModalOpen(true);
        }}
      >
        {preview.previewImage && (
          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
            <img src={preview.previewImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            {preview.authorAvatar ? (
              <img
                src={preview.authorAvatar}
                alt={preview.authorName}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                {preview.authorName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span 
              className="text-xs font-semibold truncate"
              style={{ color: isMine ? 'rgba(255,255,255,0.9)' : 'rgb(var(--foreground))' }}
            >
              {preview.authorName}
            </span>
          </div>
          <p 
            className="text-xs leading-snug line-clamp-2 m-0"
            style={{ color: isMine ? 'rgba(255,255,255,0.8)' : 'rgb(var(--muted-foreground))' }}
          >
            {summary}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedPostId(postId);
              setPostModalOpen(true);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium mt-1",
              "transition-all duration-200",
              "cursor-pointer select-none w-fit"
            )}
            style={isMine ? {
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            } : {
              background: 'rgb(var(--muted))',
              color: 'rgb(var(--foreground))',
              border: '1px solid rgb(var(--border))',
            }}
          >
            <FileText size={13} style={{ opacity: 0.85 }} />
            <span>Xem chi tiết</span>
          </button>
        </div>
      </div>
    );
  }, [postPreviews, fetchPostPreview, setSelectedPostId, setPostModalOpen]);

  const renderSharedPostCard = useCallback((sharedPost, sharedPostId, isMine) => {
    if (!sharedPost && !sharedPostId) return null;
    const preview = sharedPost || {};
    const previewImage =
      preview.previewImage ||
      (Array.isArray(preview.medias)
        ? (preview.medias.find((m) => (m.type || "").toLowerCase().includes("image")) || preview.medias[0])?.url
        : null) ||
      preview.images ||
      null;
    const summarySource = preview.content || preview.title || "";
    const summary =
      typeof summarySource === "string" && summarySource.length > 140
        ? `${summarySource.slice(0, 140)}…`
        : summarySource;
    const postLink = getPostUrl(sharedPostId || preview._id);
    const label = t("messages.sharedPostLabel") || "Đã chia sẻ một bài viết";
    const actionLabel = t("messages.openPost") || "Xem bài viết";
    const fallbackTitle = t("messages.sharedPostFallback") || "Bài viết trên Smoker";
    const authorInitial = preview.authorName ? preview.authorName[0]?.toUpperCase?.() : "S";

    return (
      <div
        className="mt-3 flex w-full gap-3 overflow-hidden rounded-2xl border"
        style={{
          borderColor: isMine ? "rgba(255,255,255,0.35)" : "rgb(var(--border))",
          background: isMine ? "rgba(255,255,255,0.08)" : "rgb(var(--card))",
        }}
      >
        {previewImage && (
          <div className="relative w-28 flex-shrink-0 overflow-hidden">
            <img src={previewImage} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div
            className="text-[11px] uppercase tracking-wide"
            style={{ color: isMine ? "rgba(255,255,255,0.75)" : "rgb(var(--muted-foreground))" }}
          >
            {label}
          </div>
          <div
            className="text-sm font-semibold leading-tight line-clamp-2"
            style={{ color: isMine ? "#fff" : "rgb(var(--foreground))" }}
          >
            {preview.title || summary || fallbackTitle}
          </div>
          {summary && (
            <div
              className="text-xs leading-snug line-clamp-3"
              style={{ color: isMine ? "rgba(255,255,255,0.85)" : "rgb(var(--muted-foreground))" }}
            >
              {summary}
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 text-xs">
            {preview.authorName && (
              <div
                className="flex items-center gap-2"
                style={{ color: isMine ? "rgba(255,255,255,0.85)" : "rgb(var(--muted-foreground))" }}
              >
                {preview.authorAvatar ? (
                  <img
                    src={preview.authorAvatar}
                    alt={preview.authorName}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase">
                    {authorInitial || "S"}
                  </div>
                )}
                <span className="line-clamp-1">{preview.authorName}</span>
              </div>
            )}
            {postLink && (
              <a
                href={postLink}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs font-semibold text-primary hover:underline"
              >
                {actionLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }, [getPostUrl, t]);

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
        <div className="mt-3 flex w-full">
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
            let text = m.content || m.message || "";
            // Keep the "reply story :" prefix for story replies, only remove old incorrect format
            if (typeof text === "string") {
              // Only remove the old incorrect format (translation key), keep the proper format
              text = text.replace(/^story\.replyYourStory:\s*/i, "");
            }
            const status = m._status || m.status; // pending | sent | delivered | read
            
            // Define bubbleTextColor early (before contentNode)
            const bubbleTextColor = isMine ? "#ffffff" : "rgb(var(--foreground))";
            
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
            // detect special content - match ChatDock logic
            const rawContent = text || "";
            const storyImgMatch = rawContent.match(/\[STORY_IMAGE:([^\]]+)\]/i);
            const storyImageUrl = storyImgMatch ? storyImgMatch[1] : null;
            const textContent = storyImageUrl ? rawContent.replaceAll(/\[STORY_IMAGE:[^\]]+\]/gi, "").trim() : rawContent;
            
            // Debug: log if message contains post link
            if (textContent && (textContent.includes('/posts/') || textContent.includes('posts/'))) {
              console.log('[MessagesPage] Message contains post link:', textContent);
            }
            
            // Debug: Check if message contains smoker://post link
            if (textContent && textContent.includes('smoker://post')) {
              console.log('[MessagesPage] Found smoker://post link in message:', textContent);
            }
            
            let contentNode = null;
            
            // Render content with story image if available (like ChatDock)
            if (storyImageUrl) {
              contentNode = (
                <div className="flex items-start gap-2">
                  <img src={storyImageUrl} alt="" className="max-h-[150px] rounded-lg object-cover" />
                  {textContent && (
                    <span 
                      style={{ 
                        color: bubbleTextColor,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        wordWrap: "break-word"
                      }}
                    >
                      {textContent}
                    </span>
                  )}
                </div>
              );
            } else {
              // Detect post links: /posts/:postId or http://.../posts/:postId
              // MongoDB ObjectId is 24 hex characters (a-f0-9, case insensitive)
              // Match pattern: /posts/ followed by 24 hex chars OR alphanumeric with dash/underscore
              const postUrlRegex = /(?:https?:\/\/[^\s]+\/)?posts\/([a-fA-F0-9]{24}|[a-zA-Z0-9_-]+)/g;
              
              // Check if message contains post link
              const hasPostLink = textContent && (textContent.includes('/posts/') || textContent.includes('posts/'));
              
              if (hasPostLink) {
                // Find all post links using matchAll
                const postMatches = [...textContent.matchAll(postUrlRegex)];
                
                console.log('[MessagesPage] Found post link in message:', textContent);
                console.log('[MessagesPage] Number of matches:', postMatches.length);
                console.log('[MessagesPage] Matches:', postMatches);
                
                if (postMatches.length > 0) {
                  // Get first post ID (if multiple links, show preview for first one)
                  const firstPostId = postMatches[0][1];
                  
                  // Render text before link (if any)
                  const linkStartIndex = postMatches[0].index;
                  const textBeforeLink = linkStartIndex > 0 ? textContent.substring(0, linkStartIndex).trim() : "";
                  
                  contentNode = (
                    <div className="flex flex-col gap-2">
                      {textBeforeLink && (
                        <span 
                          style={{ 
                            color: bubbleTextColor,
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            wordWrap: "break-word"
                          }}
                        >
                          {textBeforeLink}
                        </span>
                      )}
                      {renderPostPreviewCard(firstPostId, isMine)}
                    </div>
                  );
                } else {
                  // Fallback to regular URL parsing
                  const combinedPattern = /(https?:\/\/[^\s]+)/gi;
                  const parts = textContent ? textContent.split(combinedPattern).filter(p => p && p.trim()) : [];
                  contentNode = (
                    <span 
                      style={{ 
                        color: bubbleTextColor,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        wordWrap: "break-word"
                      }}
                    >
                      {parts.map((part, idx) => {
                        if (/^https?:\/\//i.test(part)) {
                          return (
                            <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-primary underline">
                              {part}
                            </a>
                          );
                        }
                        return <React.Fragment key={idx}>{part}</React.Fragment>;
                      })}
                    </span>
                  );
                }
              } else {
                // No smoker links, just parse regular URLs
                const combinedPattern = /(https?:\/\/[^\s]+)/gi;
                const parts = textContent ? textContent.split(combinedPattern).filter(p => p && p.trim()) : [];
                contentNode = (
                  <span 
                    style={{ 
                      color: bubbleTextColor,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      wordWrap: "break-word"
                    }}
                  >
                    {parts.map((part, idx) => {
                      if (/^https?:\/\//i.test(part)) {
                        return (
                          <a key={idx} href={part} target="_blank" rel="noreferrer" className="text-primary underline">
                            {part}
                          </a>
                        );
                      }
                      return <React.Fragment key={idx}>{part}</React.Fragment>;
                    })}
                  </span>
                );
              }
              
              // If contentNode is still null, render plain text
              if (!contentNode) {
                contentNode = (
                  <span 
                    style={{ 
                      color: bubbleTextColor,
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      wordWrap: "break-word"
                    }}
                  >
                    {textContent}
                  </span>
                );
              }
            }
            const actionIcons = [
              { label: t("comment.reply") || "Reply", Icon: Reply }
            ];
            const replyPreview = (() => {
              if (!m.replyToId) return null;
              const ref = messageMap.get(String(m.replyToId));
              if (!ref) return null;
              const refText = (ref.content || ref.message || "").toString();
              const refSender = getSenderKey(ref) === me ? t("messages.you") || "Bạn" : (ref.authorName || other?.name || "User");
            return (
              <div
                  className="mb-2 rounded-lg border px-3 py-1 text-xs"
                  style={{ borderColor: "rgb(var(--border))", background: isMine ? "rgba(255,255,255,0.15)" : "rgb(var(--card)/0.8)" }}
                >
                  <div className="font-semibold">{refSender}</div>
                  <div className="line-clamp-2 opacity-80">{refText || t("messages.attachment") || "Đính kèm"}</div>
                </div>
              );
            })();
            const bubbleStyle = isMine
              ? { 
                  color: bubbleTextColor,
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  wordWrap: "break-word"
                }
              : { 
                  background: "rgb(var(--card))", 
                  color: bubbleTextColor, 
                  borderColor: "rgb(var(--border))",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  wordWrap: "break-word"
                };
            const sharedPostCard = renderSharedPostCard(
              m.sharedPost || m.shared_post,
              m.sharedPostId || m.shared_post_id,
              isMine
            );

            const bubble = (
              <div
                key={`bubble-${i}`}
                className={cn(
                  "group relative max-w-[240px] break-words rounded-2xl px-3 py-1.5 text-sm leading-[1.35] shadow-sm sm:max-w-[280px]",
                  isMine ? "rounded-br-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" : "rounded-bl-md border",
                )}
                onClick={(e) => {
                  // Don't set reply target if clicking on a button or link
                  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                    return;
                  }
                  setReplyTarget({
                    id: m.id || m._id,
                    text,
                    preview: text?.slice(0, 60),
                  });
                }}
                style={bubbleStyle}
              >
                {replyPreview}
                <div className="flex items-start gap-2">
                  {contentNode}
                </div>
                {sharedPostCard}

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
              </div>
            );
            const nextSender = displayMessages[i + 1] ? getSenderKey(displayMessages[i + 1]) : null;
            const showAvatar = !isMine && sender !== nextSender;
            return (
              <React.Fragment key={i}>
                {shouldShowTimestamp(i, displayMessages) && (
                  <div className="mb-3 flex w-full justify-center">
                    <span className="rounded-full px-3 py-0.5 text-[11px] text-muted-foreground" style={{ background: "rgb(var(--card))" }}>
                      {formatTimestampLabel(getTimestamp(m))}
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    "group/message flex items-end gap-2 py-1",
                    isMine ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMine && showAvatar && (
                    <img
                      src={m.authorAvatar || other?.avatar}
                      alt={m.authorName || other?.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  )}
                  {!isMine && !showAvatar && (
                    <div className="h-7 w-7 flex-shrink-0" />
                  )}
                  {isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--muted-foreground))" }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label} type="button">
                          <Icon size={14} />
                        </button>
                      ))}
                      <span className="ml-2 text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(getTimestamp(m)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                  {bubble}
                  {!isMine && (
                    <div
                      className="hidden items-center gap-1 rounded-full border px-2 py-1 text-xs opacity-0 transition group-hover/message:opacity-100 lg:flex"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--muted-foreground))" }}
                    >
                      {actionIcons.map(({ label, Icon }) => (
                        <button key={label} title={label} type="button">
                          <Icon size={14} />
                        </button>
                      ))}
                      <span className="ml-2 text-[11px] whitespace-nowrap text-muted-foreground">
                        {new Date(getTimestamp(m)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
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
        <NotificationToPostModal
          open={postModalOpen}
          postId={selectedPostId}
          commentId={selectedCommentId}
          onClose={() => {
            setPostModalOpen(false);
            setSelectedPostId(null);
            setSelectedCommentId(null);
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


