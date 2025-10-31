// ProfileFollowInfo.js
import React, { useState } from "react";

export default function ProfileFollowInfo({ followers, following, friends, bio, contact }) {
    const [expanded, setExpanded] = useState(false);
    const MAX_LENGTH = 100; // giới hạn ký tự trước khi hiển thị "Xem thêm"

    const toggleExpand = () => setExpanded(!expanded);
    const bioContent = expanded || !bio ? bio : bio.slice(0, MAX_LENGTH) + (bio.length > MAX_LENGTH ? "..." : "");

    return (
        <aside className="profile-sidebar flex-shrink-0 w-[30%] min-w-[250px]">
            {/* --- Follow Info --- */}
            {/* --- Follow Info --- */}
            {/* --- Follow Info --- */}
            <div
                className="profile-card mb-4 p-4 rounded-xl border flex justify-between text-center"
                style={{
                    borderColor: "rgb(var(--border))",
                    backgroundColor: "rgb(var(--card))",
                }}
            >
                <div>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">Follower</p>
                    <p className="font-semibold">{followers}</p>
                </div>
                <div>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">Following</p>
                    <p className="font-semibold">{following}</p>
                </div>
                <div>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">Bạn bè</p>
                    <p className="font-semibold">{friends}</p>
                </div>
            </div>



            {/* --- Bio --- */}
            {bio && (
                <div className="profile-card mb-4 p-4 rounded-xl border" style={{ borderColor: "rgb(var(--border))", backgroundColor: "rgb(var(--card))" }}>
                    <h4 className="font-semibold mb-2">Bio</h4>
                    <p className="text-sm text-[rgb(var(--muted-foreground))]">
                        {bioContent}
                        {bio.length > MAX_LENGTH && (
                            <button
                                className="ml-1 text-[rgb(var(--primary))] hover:text-[rgb(var(--secondary))] text-sm"
                                onClick={toggleExpand}
                            >
                                {expanded ? "Thu gọn" : "Xem thêm"}
                            </button>
                        )}
                    </p>
                </div>
            )}


        </aside>
    );
}
