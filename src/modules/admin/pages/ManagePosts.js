import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";
import { Search, Loader2, RefreshCw, Eye, Trash2, RotateCcw, Filter } from "lucide-react";
import { getAllPostsForAdmin, updatePostStatusForAdmin } from "../../../api/postApi";
import PostDetailModalForAdmin from "../../feeds/components/modals/PostDetailModalForAdmin";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "trashed", label: "Trashed" },
  { value: "deleted", label: "Deleted" },
];

export default function ManagePosts() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });
  const [viewingPost, setViewingPost] = useState(null); // { postId: string }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // Sử dụng endpoint admin để lấy tất cả posts
      const params = {
        page,
        limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      };
      
      const res = await getAllPostsForAdmin(params);
      // Axios interceptor already returns response.data, so res is already the payload
      const payload = res;
      
      console.log("[ManagePosts] Response payload:", payload);
      
      if (payload && payload.success) {
        setPosts(payload.data || []);
        setTotal(payload.pagination?.total || 0);
      } else {
        setPosts([]);
        setTotal(0);
        console.error("[ManagePosts] API returned error:", payload?.message || "Unknown error", payload);
      }
    } catch (err) {
      console.error("[ManagePosts] Fetch failed", err);
      alert("Không thể tải danh sách bài viết");
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.status]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchPosts();
      } else {
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const handleDeletePost = async (post) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này? (Đổi status thành deleted)")) {
      return;
    }
    try {
      const postId = post.id || post._id;
      await updatePostStatusForAdmin(postId, "deleted");
      alert("Đã xóa bài viết thành công");
      await fetchPosts();
    } catch (err) {
      console.error("[ManagePosts] Delete failed", err);
      alert(err.response?.data?.message || "Không thể xóa bài viết");
    }
  };

  const handleRestorePost = async (post) => {
    if (!window.confirm("Bạn có chắc muốn khôi phục bài viết này?")) {
      return;
    }
    try {
      const postId = post.id || post._id;
      await updatePostStatusForAdmin(postId, "public");
      alert("Đã khôi phục bài viết thành công");
      await fetchPosts();
    } catch (err) {
      console.error("[ManagePosts] Restore failed", err);
      alert(err.response?.data?.message || "Không thể khôi phục bài viết");
    }
  };

  const handleViewPost = (post) => {
    const postId = post.id || post._id;
    if (postId) {
      setViewingPost({ postId });
    }
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      <div className={cn("flex items-center justify-between gap-3 mb-6 flex-wrap")}>
        <h1 className={cn("text-2xl md:text-3xl font-bold text-foreground")}>
          Quản lý bài viết
        </h1>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md",
            "border border-border/30 text-foreground hover:bg-muted/40"
          )}
          onClick={fetchPosts}
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className={cn("rounded-lg p-4 bg-card border-[0.5px] border-border/20 mb-4 flex flex-wrap gap-3 items-end")}>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Trạng thái
          </span>
          <select
            className="border border-border/50 bg-background rounded-md px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, status: e.target.value }));
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Search className="w-3 h-3" /> Tìm kiếm
          </span>
          <div className="relative">
            <input
              className="w-full border border-border/50 bg-background rounded-md px-3 py-2 text-sm pr-10"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchPosts();
                }
              }}
              placeholder="Tìm kiếm theo nội dung, tác giả..."
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setPage(1);
                fetchPosts();
              }}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className={cn("rounded-lg bg-card border-[0.5px] border-border/20 overflow-hidden")}>
        <div className={cn("grid grid-cols-12 px-4 py-3 text-sm font-semibold text-muted-foreground border-b border-border/20")}>
          <div className="col-span-4">Bài viết</div>
          <div className="col-span-2">Tác giả</div>
          <div className="col-span-2">Trạng thái</div>
          <div className="col-span-2">Ngày tạo</div>
          <div className="col-span-2 text-right">Thao tác</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Không có bài viết</div>
        ) : (
          posts.map((post) => {
            const postId = post.id || post._id;
            const postStatus = post.status || "public";
            const authorName = post.authorName || post.authorEntityName || post.entityAccountName || "Unknown";
            const content = post.content || post.caption || post.title || "";
            const previewContent = content.length > 100 ? content.substring(0, 100) + "..." : content;
            const createdAt = post.createdAt ? new Date(post.createdAt).toLocaleString("vi-VN") : "-";

            return (
              <div key={postId} className="grid grid-cols-12 px-4 py-3 border-b border-border/10 text-sm items-center">
                <div className="col-span-4">
                  <div className="font-semibold text-foreground line-clamp-2">{previewContent || "(Không có nội dung)"}</div>
                  <div className="text-muted-foreground text-xs break-all font-mono mt-1">ID: {postId}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-foreground text-xs">{authorName || post.authorEntityName || "Unknown"}</div>
                  <div className="text-muted-foreground text-xs break-all font-mono">{post.entityAccountId || post.accountId || "-"}</div>
                </div>
                <div className="col-span-2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                    postStatus === "public" ? "bg-emerald-100 text-emerald-700" :
                    postStatus === "private" ? "bg-blue-100 text-blue-700" :
                    postStatus === "trashed" ? "bg-amber-100 text-amber-700" :
                    postStatus === "deleted" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  )}>
                    {postStatus}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {createdAt}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50"
                    onClick={() => handleViewPost(post)}
                    title="Xem chi tiết"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {(postStatus === "trashed" || postStatus === "deleted") && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 text-emerald-600"
                      onClick={() => handleRestorePost(post)}
                      title="Khôi phục (đổi status thành public)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  {postStatus !== "deleted" && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 text-red-600"
                      onClick={() => handleDeletePost(post)}
                      title="Xóa (đổi status thành deleted)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span>Trang {page}/{totalPages} — {total} bài viết</span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Trước
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-md border text-xs hover:bg-muted/50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Sau
          </button>
        </div>
      </div>

      {/* Post Detail Modal */}
      {viewingPost && viewingPost.postId && (
        <PostDetailModalForAdmin
          open={true}
          postId={viewingPost.postId}
          onClose={() => setViewingPost(null)}
          title="Chi tiết bài viết"
        />
      )}
    </div>
  );
}

