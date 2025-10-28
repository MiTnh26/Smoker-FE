// ProfileFollowInfo.js
import React, { useMemo, useState } from "react";

export default function ProfileFollowInfo({ followers, following, friends, bio, contact }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_LENGTH = 140;

  const pretty = useMemo(() => {
    const format = (n) => {
      const num = Number(n || 0);
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
      if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
      return String(num);
    };
    return {
      followers: format(followers),
      following: format(following),
      friends: format(friends),
    };
  }, [followers, following, friends]);

  const bioText = useMemo(() => {
    if (!bio) return "";
    if (expanded) return bio;
    const trimmed = bio.slice(0, MAX_LENGTH);
    return trimmed + (bio.length > MAX_LENGTH ? "..." : "");
  }, [bio, expanded]);

  return (
    <aside className="profile-sidebar flex-shrink-0 w-full md:w-[30%] min-w-[260px] space-y-4">
      <section
        className="rounded-2xl border shadow-sm p-4 md:p-5 bg-[rgb(var(--card))]"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div className="grid grid-cols-3 gap-3">
          <StatItem label="Follower" value={pretty.followers} />
          <StatItem label="Following" value={pretty.following} />
          <StatItem label="Bạn bè" value={pretty.friends} />
        </div>
      </section>

      {bio && (
        <section
          className="rounded-2xl border shadow-sm p-4 md:p-5 bg-[rgb(var(--card))]"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <h4 className="text-[15px] font-semibold text-[rgb(var(--foreground))] mb-2">Giới thiệu</h4>
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            {bioText}
            {bio.length > MAX_LENGTH && (
              <button
                type="button"
                className="ml-2 inline-flex items-center text-[rgb(var(--primary))] hover:text-[rgb(var(--secondary))] focus:outline-none"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Thu gọn" : "Xem thêm"}
              </button>
            )}
          </p>
        </section>
      )}

      {contact && (
        <section
          className="rounded-2xl border shadow-sm p-4 md:p-5 bg-[rgb(var(--card))]"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <h4 className="text-[15px] font-semibold text-[rgb(var(--foreground))] mb-3">Liên hệ</h4>
          <div className="space-y-2 text-sm text-[rgb(var(--muted-foreground))]">
            {contact.email && (
              <div className="flex items-center justify-between">
                <span>Email</span>
                <a className="text-[rgb(var(--primary))] hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center justify-between">
                <span>Điện thoại</span>
                <a className="text-[rgb(var(--primary))] hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a>
              </div>
            )}
            {contact.website && (
              <div className="flex items-center justify-between">
                <span>Website</span>
                <a className="text-[rgb(var(--primary))] hover:underline" href={contact.website} target="_blank" rel="noreferrer">
                  {contact.website}
                </a>
              </div>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="group rounded-xl border p-3 text-center bg-[rgb(var(--card))] hover:shadow-md transition-transform duration-200 hover:-translate-y-0.5"
      style={{ borderColor: "rgb(var(--border))" }}
    >
      <div className="text-[22px] font-semibold text-[rgb(var(--foreground))] tracking-wide">{value}</div>
      <div className="text-xs mt-1 text-[rgb(var(--muted-foreground))]">{label}</div>
    </div>
  );
}
