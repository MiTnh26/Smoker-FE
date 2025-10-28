import React from "react";

export default function BarFollowInfo({ followers = 2, following = 2, friends = 2, bio = "", contact = [] }) {
  return (
    <aside className="profile-sidebar flex flex-col gap-6">
      
      {/* --- Follow Info --- */}
      <div className="profile-card p-4 rounded-xl border border-gray-700 bg-gray-900 flex justify-around text-center">
        <div>
          <p className="text-sm text-gray-400">Followers</p>
          <p className="font-semibold text-white text-lg">{followers}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Following</p>
          <p className="font-semibold text-white text-lg">{following}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Friends</p>
          <p className="font-semibold text-white text-lg">{friends}</p>
        </div>
      </div>

      {/* --- Bio & Contact --- */}
      <div className="profile-card p-4 rounded-xl border border-gray-700 bg-gray-900">
        {bio && (
          <div className="mb-3">
            <p className="text-sm text-gray-400">Bio</p>
            <p className="text-white text-sm">{bio}</p>
          </div>
        )}

        {contact.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-400">Liên hệ</p>
            {contact.map((c, idx) => (
              <p key={idx} className="text-white text-sm">{c}</p>
            ))}
          </div>
        )}
      </div>
      
    </aside>
  );
}
