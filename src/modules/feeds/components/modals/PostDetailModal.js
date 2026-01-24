import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { getPostDetail } from "../../../../api/postApi";
import PostCard from "../post/PostCard";
import CommentSection from "../comment/CommentSection";
import CommentInputForm from "../comment/CommentInputForm";
import { getSessionData } from "../comment/utils";
import { mapPostForCard } from "../../../../utils/postTransformers";

export default function PostDetailModal({ 
  open, 
  post: initialPost, 
  postId, 
  commentId, 
  onClose,
  title,
  onPostUpdated = null // Callback để sync state với parent (PostCard)
}) {
  const { t } = useTranslation();
  const sessionData = getSessionData();
  const activeEntity = sessionData?.activeEntity || sessionData?.account || null;

  // 1. Khai báo State
  const [postData, setPostData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playingPost, setPlayingPost] = useState(null);
  const [sharedCurrentTime, setSharedCurrentTime] = useState(0);
  
  const sharedAudioRef = useRef(null);
  const commentSectionRef = useRef(null);
  const likedStateRef = useRef(null);
  const initialPostRef = useRef(null);
  const lastFetchedPostIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // 2. Khai báo các hàm Helper (Phải nằm TRÊN useEffect)
  const transformPostData = useCallback((post) => {
    if (!post) return null;
    return mapPostForCard(post, t, activeEntity);
  }, [t, activeEntity]);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);

      const response = await getPostDetail(postId, { includeMedias: true, includeMusic: true });
      let incomingPost = response?.data || response;

      if (!incomingPost?._id && !incomingPost?.id) {
        setError("Post not found");
        return;
      }

      const transformedPost = transformPostData(incomingPost);
      
      // Preserve like state nếu likedStateRef đã được set (từ initialPost)
      if (likedStateRef.current === true && !transformedPost.likedByCurrentUser) {
        transformedPost.likedByCurrentUser = true;
        if (transformedPost.stats) {
          transformedPost.stats.isLikedByMe = true;
        }
      }

          // Chỉ set state nếu modal còn mở
          if (isMountedRef.current) {
            setPostData(transformedPost);
          }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [postId, transformPostData]);

  // 3. Các useEffect xử lý Lifecycle
  // Effect 1: Xử lý khi modal mở/đóng
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      isMountedRef.current = false;
      setPostData(null);
      setError(null);
      likedStateRef.current = null;
      initialPostRef.current = null;
      lastFetchedPostIdRef.current = null;
      return;
    }

    isMountedRef.current = true;
    document.body.style.overflow = "hidden";
    
    // Lưu initialPost vào ref để tránh dependency issues
    if (initialPost) {
      initialPostRef.current = initialPost;

      // Transform initialPost trước (để có like state đúng từ checkPostIsLiked)
      const transformedInitial = transformPostData(initialPost);
      
      // Check like state từ transformedInitial (đã được check bằng checkPostIsLiked)
      // Không preserve nếu initialPost có thể đã cũ, chỉ dựa vào kết quả transform
      const initialLiked = transformedInitial.likedByCurrentUser === true || transformedInitial.stats?.isLikedByMe === true;
      
      // Set likedStateRef từ transformedInitial (đáng tin cậy hơn)
      likedStateRef.current = initialLiked;
      
      setPostData(transformedInitial);
    }
    
    // Fetch post nếu có postId và chưa fetch postId này
    if (postId && lastFetchedPostIdRef.current !== postId) {
      lastFetchedPostIdRef.current = postId;
      
      // Gọi fetchPost trực tiếp để tránh dependency issues
      (async () => {
        try {
          setLoading(true);
          const response = await getPostDetail(postId, { includeMedias: true, includeMusic: true });
          let incomingPost = response?.data || response;

          if (!incomingPost?._id && !incomingPost?.id) {
            setError("Post not found");
            return;
          }

          const transformedPost = transformPostData(incomingPost);
    
          // Preserve like state nếu likedStateRef đã được set (từ initialPost)
          if (likedStateRef.current === true && !transformedPost.likedByCurrentUser) {
            transformedPost.likedByCurrentUser = true;
            if (!transformedPost.stats) {
              transformedPost.stats = {};
            }
            transformedPost.stats.isLikedByMe = true;
          }
          
          // Nếu không có initialPost (mở từ notification), check lại like state từ transformedPost
          // vì transformPostData đã check bằng checkPostIsLiked (từ likesObject)
          // Nếu transformedPost.likedByCurrentUser là true, set likedStateRef để preserve cho lần sau
          if (!initialPost && transformedPost.likedByCurrentUser === true) {
            likedStateRef.current = true;
          }

          // Chỉ set state nếu modal còn mở
          if (isMountedRef.current) {
            setPostData(transformedPost);
          }
        } catch (err) {
          if (isMountedRef.current) {
            setError(err.message);
          }
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      })();
    }
    
    // Cleanup function để đảm bảo ref được reset khi unmount hoặc modal đóng
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  // 4. Các Handler khác
  const handleSeek = (newTime) => {
    setSharedCurrentTime(newTime);
    if (sharedAudioRef.current) sharedAudioRef.current.currentTime = newTime;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[680px] max-h-[90vh] bg-card rounded-lg overflow-hidden flex flex-col relative z-[10000]"
           onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-5 border-b border-border/30 flex items-center justify-between bg-card/80 backdrop-blur-sm">
          <h2 className="text-xl font-semibold m-0">
            {title || postData?.author?.name || t('notifications.postDetail')}
          </h2>
          <button onClick={onClose} className="hover:bg-muted/50 rounded-full p-1 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && !postData && <div className="p-12 text-center">{t('action.loading')}</div>}
          {error && <div className="p-12 text-center text-destructive">{error}</div>}

          {postData && (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-hide [&_form]:hidden [&_.view-all-comments-link]:hidden">
                  <PostCard
                    post={postData}
                    playingPost={playingPost}
                    setPlayingPost={setPlayingPost}
                    sharedAudioRef={sharedAudioRef}
                    sharedCurrentTime={sharedCurrentTime}
                    onSeek={handleSeek}
                    disableCommentButton={true}
                  onLike={(likeData) => {
                    // Kiểm tra modal còn mở và postData còn tồn tại
                    if (!isMountedRef.current) return;
                    
                    setPostData(prev => {
                      // Nếu prev là null (modal đã đóng), không update
                      if (!prev) return prev;
                      
                      return {
                        ...prev,
                        likedByCurrentUser: likeData.liked,
                        likes: likeData.likeCount, // Đồng bộ với stats.likeCount
                        stats: { 
                          ...(prev.stats || {}), 
                          isLikedByMe: likeData.liked, 
                          likeCount: likeData.likeCount 
                        }
                      };
                    });
                    
                    // Đồng bộ state với parent (PostCard) để khi đóng modal, PostCard cũng có state đúng
                    if (onPostUpdated && isMountedRef.current) {
                      onPostUpdated({
                        postId: postData?.id || postId,
                        liked: likeData.liked,
                        likeCount: likeData.likeCount
                      });
                    }
                  }}
                />
                
                <div className="border-t border-border/30 pt-2">
                    <CommentSection
                    ref={commentSectionRef}
                    key={`comments-${postData.id}`}
                    postId={String(postData.id)}
                      alwaysOpen={true}
                      inline={true}
                      scrollToCommentId={commentId}
                    onPostUpdated={fetchPost}
                    />
                  </div>
              </div>

              <div className="border-t border-border/30 bg-card p-2">
                  <CommentInputForm
                  postId={String(postData.id)}
                  onCommentAdded={(responseData) => {
                    // Kiểm tra modal còn mở và postData còn tồn tại
                    if (!isMountedRef.current) return;
                    
                    setPostData(prev => {
                      // Nếu prev là null (modal đã đóng), không update
                      if (!prev) return prev;
                      
                      return {
                        ...prev,
                        stats: { 
                          ...(prev.stats || {}), 
                          commentCount: (prev.stats?.commentCount || 0) + 1 
                        }
                      };
                    });
                    
                    if (commentSectionRef.current && isMountedRef.current) {
                      commentSectionRef.current.handleNewComment(responseData);
                    }
                  }}
                  />
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

PostDetailModal.propTypes = {
  open: PropTypes.bool.isRequired,
  post: PropTypes.object,
  postId: PropTypes.string,
  commentId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  onPostUpdated: PropTypes.func, // Callback để sync state với parent
};