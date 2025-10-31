import { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";
import PostCard from "./PostCard";
import PostComposerModal from "./PostComposerModal";
import CreatePostBox from "./CreatePostBox";

export default function PostFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingPost, setPlayingPost] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load posts automatically on component mount
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadPosts();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const loadPosts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await axiosClient.get("/posts");

      if (response.success) {
        setPosts(response.data || []);
      } else {
        console.error("[FEED] Failed to load posts:", response.message);
        setError(response.message || "Failed to load posts");
      }
    } catch (err) {
      console.error("[FEED] Error loading posts:", err);
      setError("Không thể tải bài viết. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePostCreated = (newPost) => {
    console.log("[FEED] New post created");
    setPosts(prevPosts => [newPost, ...prevPosts]);
    setShowComposer(false);
  };

  // Transform post data to match PostCard component expectations
  const transformPost = (post) => {
    // Read session for fallback avatar/name
    let session
    try {
      const raw = localStorage.getItem("session")
      session = raw ? JSON.parse(raw) : null
    } catch (e) {
      session = null
    }
    const currentUser = session?.account
    const activeEntity = session?.activeEntity || currentUser

    return {
      id: post._id || post.postId,
      user:
        post.authorName ||
        post.authorEntityName ||
        post.author?.userName ||
        post.account?.userName ||
        post.accountName ||
        activeEntity?.name ||
        currentUser?.userName ||
        "Người dùng",
      avatar:
        post.authorAvatar || post.authorEntityAvatar ||
        post.author?.avatar ||
        post.account?.avatar ||
        currentUser?.avatar ||
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNlNWU3ZWIiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkMxNC4yMDkxIDEyIDE2IDEwLjIwOTEgMTYgOEMxNiA1Ljc5MDg2IDE0LjIwOTEgNCAxMiA0QzkuNzkwODYgNCA4IDUuNzkwODYgOCA4QzggMTAuMjA5MSA5Ljc5MDg2IDEyIDEyIDEyWiIgZmlsbD0iIzljYTNhZiIvPgo8cGF0aCBkPSJNMTIgMTRDMTUuMzEzNyAxNCAxOCAxNi42ODYzIDE4IDIwSDEwQzEwIDE2LjY4NjMgMTIuNjg2MyAxNCAxMiAxNFoiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+Cjwvc3ZnPgo=",
      time: new Date(post.createdAt).toLocaleString('vi-VN'),
      content: post.content || post.caption || post["Tiêu Đề"],
      image: post.url && post.url !== "default-post.jpg" ? post.url : null,
      likes: post.likes ? Object.keys(post.likes).length : 0,
      comments: post.comments ? Object.keys(post.comments).length : 0,
      shares: 0,
      hashtags: [],
      audioSrc: null,
      audioTitle: null,
      videoSrc: null
    };
  };

  // Minimal loader/error using existing layout classes
  if (loading) {
    return (
      <div className="feed-posts space-y-4">
        <p className="text-gray-400">Đang tải bài viết...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-posts space-y-4">
        <div>
          <p className="text-red-500">❌ {error}</p>
          <button onClick={() => loadPosts(true)} className="btn btn-primary mt-2">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* CreatePostBox - nhấp vào input để tạo bài viết */}
      <CreatePostBox onCreate={() => {
        setShowComposer(true);
      }} />

      <div className="feed-posts space-y-4">
        {posts.length === 0 ? (
          <p className="text-gray-400">Chưa có bài viết nào.</p>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id || post.postId}
              post={transformPost(post)}
              playingPost={playingPost}
              setPlayingPost={setPlayingPost}
            />
          ))
        )}

        {/* Tùy chọn nhỏ: thông báo đang làm mới, không thay đổi giao diện chính */}
        {refreshing && (
          <p className="text-gray-400">Đang làm mới...</p>
        )}
      </div>

      {/* Post Composer Modal (giữ nguyên UI hiện có) */}
      <PostComposerModal
        open={showComposer}
        onClose={() => setShowComposer(false)}
        onCreated={handlePostCreated}
      />
    </>
  );
}
