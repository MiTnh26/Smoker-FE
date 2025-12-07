import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../../utils/cn";
import userReviewApi from "../../../api/userReviewApi";

const GUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const pickGuid = (candidates = []) => {
  for (const candidate of candidates) {
    if (!candidate) continue;
    let value = candidate;
    if (typeof candidate === "object") {
      value = candidate.AccountId || candidate.accountId || candidate.id || candidate.Id || null;
    }
    if (!value) continue;
    const normalized = String(value).trim();
    if (GUID_REGEX.test(normalized)) {
      return normalized.toLowerCase();
    }
  }
  return null;
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const StarInput = ({ value, onChange, disabled }) => (
  <div className={cn("flex items-center gap-1")}>
    {Array.from({ length: 5 }).map((_, index) => (
      <button
        type="button"
        key={index}
        onClick={() => !disabled && onChange(index + 1)}
        className={cn(
          "bg-transparent border-none cursor-pointer",
          "transition-all duration-200",
          "hover:opacity-80 active:scale-95",
          "focus:outline-none"
        )}
        disabled={disabled}
      >
        <Star
          size={20}
          className={cn(
            index < value ? "text-warning fill-warning" : "text-muted-foreground/40"
          )}
        />
      </button>
    ))}
  </div>
);

StarInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

const normalizeReview = (item) => ({
  id: item.ReviewId || item.id,
  businessAccountId: item.BussinessAccountId || item.businessAccountId,
  accountId: item.AccountId || item.accountId,
  star: item.StarValue || item.star || 0,
  comment: item.Content || item.content || "",
  createdAt: item.created_at || item.createdAt || item.updatedAt || null,
  Picture: item.Picture || null, // Ảnh feed
  FeedBackContent: item.FeedBackContent || null, // Ảnh back hoặc text
  BookingId: item.BookingId || item.bookingId, // ID booking
  BookingDate: item.BookingDate || item.bookingDate, // Ngày book
  Picture: item.Picture || null, // Ảnh feed
  FeedBackContent: item.FeedBackContent || null, // Ảnh back hoặc text
  reviewer: {
    accountId:
      item.reviewer?.AccountId ||
      item.reviewer?.accountId ||
      item.AccountId ||
      item.accountId ||
      null,
    name:
      item.reviewer?.UserName ||
      item.reviewer?.userName ||
      item.user?.UserName ||
      item.user?.userName ||
      "Ẩn danh",
    avatar:
      item.reviewer?.Avatar ||
      item.reviewer?.avatar ||
      item.user?.Avatar ||
      item.user?.avatar ||
      "https://i.pravatar.cc/100",
  },
});

const defaultStats = {
  count: 0,
  averageStar: 0,
  breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

export default function PerformerReviews({
  businessAccountId,
  performerName,
  performerRole,
  isOwnProfile,
  allowSubmission = true,
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(defaultStats);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ rating: 0, comment: "" });

  const accountCandidates = useMemo(
    () => {
      try {
        const sessionRaw = localStorage.getItem("session");
        const session = sessionRaw ? JSON.parse(sessionRaw) : {};
        return [
          user?.accountId,
          user?.AccountId,
          user?.id,
          session?.account?.AccountId,
          session?.account?.accountId,
          session?.account?.id,
          session?.accountId,
          session?.tokenAccountId,
        ];
      } catch (err) {
        console.warn("[PerformerReviews] Failed to read session:", err);
        return [user?.accountId, user?.AccountId, user?.id];
      }
    },
    [user]
  );

  const reviewerAccountId = useMemo(
    () => pickGuid(accountCandidates),
    [accountCandidates]
  );

  // Kiểm tra user hiện tại có phải là DJ, BAR, hoặc DANCER không
  const isBusinessRole = useMemo(() => {
    if (!user) return false;
    try {
      const sessionRaw = localStorage.getItem("session");
      if (!sessionRaw) return false;
      const session = sessionRaw ? JSON.parse(sessionRaw) : {};
      const active = session?.activeEntity || {};
      const role = (active.Role || active.role || user.role || user.Role || "").toString().toUpperCase();
      // Kiểm tra nếu role là BAR, DJ, DANCER, hoặc BUSINESS
      return role.includes("BAR") || role.includes("DJ") || role.includes("DANCER") || role.includes("BUSINESS");
    } catch {
      return false;
    }
  }, [user]);

  const fetchReviews = useCallback(async () => {
    if (!businessAccountId) {
      setReviews([]);
      setStats(defaultStats);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await userReviewApi.getByBusiness(businessAccountId);
      const payload = res?.data || res;
      const normalizedList = Array.isArray(payload?.reviews)
        ? payload.reviews.map(normalizeReview)
        : Array.isArray(payload?.data?.reviews)
        ? payload.data.reviews.map(normalizeReview)
        : [];
      const statsPayload =
        payload?.stats || payload?.data?.stats || defaultStats;

      setReviews(normalizedList);
      setStats({
        count: statsPayload?.count ?? normalizedList.length,
        averageStar: statsPayload?.averageStar ?? 0,
        breakdown: {
          1: statsPayload?.breakdown?.[1] ?? 0,
          2: statsPayload?.breakdown?.[2] ?? 0,
          3: statsPayload?.breakdown?.[3] ?? 0,
          4: statsPayload?.breakdown?.[4] ?? 0,
          5: statsPayload?.breakdown?.[5] ?? 0,
        },
      });
    } catch (err) {
      console.error("[PerformerReviews] Failed to fetch reviews:", err);
      setError(
        err?.response?.data?.error || t("performerReviews.fetchError")
      );
    } finally {
      setLoading(false);
    }
  }, [businessAccountId, t]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const myReview = useMemo(() => {
    if (!reviewerAccountId) return null;
    return reviews.find(
      (review) =>
        review.accountId &&
        review.accountId.toLowerCase() === reviewerAccountId.toLowerCase()
    );
  }, [reviews, reviewerAccountId]);

  useEffect(() => {
    if (myReview) {
      setForm({
        rating: myReview.star,
        comment: myReview.comment || "",
      });
    } else {
      setForm({ rating: 0, comment: "" });
      setEditing(false);
    }
  }, [myReview]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reviewerAccountId) {
      alert(t("performerReviews.loginRequired"));
      return;
    }
    if (!form.rating) {
      alert(t("performerReviews.ratingRequired"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await userReviewApi.create({
        BussinessAccountId: businessAccountId,
        AccountId: reviewerAccountId,
        Content: form.comment.trim(),
        StarValue: form.rating,
      });
      await fetchReviews();
      setEditing(false);
    } catch (err) {
      console.error("[PerformerReviews] Submit failed:", err);
      setError(
        err?.response?.data?.error || t("performerReviews.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!reviewId) return;
    const win = typeof window !== "undefined" ? window : undefined;
    const confirmed = win
      ? win.confirm(t("performerReviews.deleteConfirm"))
      : true;
    if (!confirmed) return;
    try {
      await userReviewApi.remove(reviewId);
      await fetchReviews();
    } catch (err) {
      console.error("[PerformerReviews] Delete failed:", err);
      setError(
        err?.response?.data?.error || t("performerReviews.deleteError")
      );
    }
  };

  const averageLabel = useMemo(() => {
    if (!stats.count) return t("performerReviews.noReviewsYet");
    return t("performerReviews.averageStars", {
      value: stats.averageStar?.toFixed?.(1) ?? "0.0",
      total: stats.count,
    });
  }, [stats, t]);

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border/20 shadow-sm",
        "p-5 md:p-6 flex flex-col gap-6"
      )}
    >
      <div className={cn("flex flex-col gap-2")}>
        <h3 className={cn("text-xl font-semibold text-foreground")}>
          {t("performerReviews.sectionTitle", {
            name: performerName || t("performerReviews.defaultName"),
          })}
        </h3>
        <p className={cn("text-sm text-muted-foreground")}>{averageLabel}</p>
        {stats.count > 0 && (
          <div className={cn("flex flex-wrap gap-3 text-xs text-muted-foreground")}>
            {([5, 4, 3, 2, 1] || []).map((star) => (
              <span key={star} className={cn("flex items-center gap-1")}>
                <Star size={12} className={cn("text-warning", "fill-warning")} />
                <span>{star}★</span>
                <span>({stats.breakdown?.[star] ?? 0})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          className={cn(
            "rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger"
          )}
        >
          {error}
        </div>
      )}

      {allowSubmission && !isOwnProfile && !isBusinessRole && (
        <div
          className={cn(
            "rounded-xl border border-border/30 bg-background/60",
            "p-4 flex flex-col gap-3"
          )}
        >
          <h4 className={cn("text-base font-semibold text-foreground")}>
            {t("performerReviews.formTitle", {
              role: performerRole || t("performerReviews.defaultRole"),
            })}
          </h4>

          {!reviewerAccountId && (
            <p className={cn("text-sm text-muted-foreground")}>
              {t("performerReviews.loginRequired")}
            </p>
          )}

          {reviewerAccountId && (
            <>
              {myReview && !editing && (
                <div
                  className={cn(
                    "rounded-lg bg-muted/20 border border-muted/30 p-3 text-sm flex flex-col gap-2"
                  )}
                >
                  <span>
                    {t("performerReviews.youReviewedAt", {
                      date: formatDateTime(myReview.createdAt),
                    })}
                  </span>
                  <div className={cn("flex items-center gap-1")}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={16}
                        className={cn(
                          index < myReview.star
                            ? "text-warning fill-warning"
                            : "text-muted-foreground/40"
                        )}
                      />
                    ))}
                  </div>
                  {myReview.comment && (
                    <p className={cn("text-sm text-foreground leading-relaxed")}>
                      {myReview.comment}
                    </p>
                  )}
                  <div className={cn("flex gap-2")}>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium",
                        "bg-primary text-primary-foreground border-none",
                        "hover:opacity-90 active:scale-95 transition-all"
                      )}
                      onClick={() => setEditing(true)}
                    >
                      {t("performerReviews.editReview")}
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium",
                        "bg-transparent border border-danger/30 text-danger",
                        "hover:bg-danger/10 active:scale-95 transition-all"
                      )}
                      onClick={() => handleDelete(myReview.id)}
                    >
                      {t("performerReviews.deleteReview")}
                    </button>
                  </div>
                </div>
              )}

              {(editing || !myReview) && (
                <form onSubmit={handleSubmit} className={cn("flex flex-col gap-3")}>
                  <div className={cn("flex items-center gap-3 flex-wrap")}>
                    <span className={cn("text-sm font-medium text-foreground")}>
                      {t("performerReviews.selectRating")}
                    </span>
                    <StarInput
                      value={form.rating}
                      onChange={(value) => setForm((prev) => ({ ...prev, rating: value }))}
                      disabled={submitting}
                    />
                  </div>
                  <textarea
                    rows={3}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg",
                      "border border-border/20",
                      "bg-background text-foreground",
                      "outline-none transition-all duration-200",
                      "placeholder:text-muted-foreground/60",
                      "focus:border-primary/40 focus:ring-1 focus:ring-primary/20",
                      "resize-y"
                    )}
                    placeholder={t("performerReviews.placeholder")}
                    value={form.comment}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, comment: event.target.value }))
                    }
                    disabled={submitting}
                  />
                  <div className={cn("flex items-center gap-2")}>
                    <button
                      type="submit"
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-semibold border-none",
                        "bg-warning text-foreground transition-all duration-200",
                        "hover:bg-warning/90 active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      )}
                      disabled={submitting || !form.rating}
                    >
                      {myReview
                        ? t("performerReviews.updateReview")
                        : t("performerReviews.submitReview")}
                    </button>
                    {myReview && (
                      <button
                        type="button"
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-semibold border border-border/40",
                          "bg-transparent text-muted-foreground transition-all duration-200",
                          "hover:bg-muted/20 active:scale-95"
                        )}
                        onClick={() => {
                          setEditing(false);
                          setForm({
                            rating: myReview.star,
                            comment: myReview.comment || "",
                          });
                        }}
                        disabled={submitting}
                      >
                        {t("performerReviews.cancel")}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {(isOwnProfile || isBusinessRole) && (
        <div
          className={cn(
            "rounded-xl border border-border/30 bg-muted/20 p-4 text-sm text-muted-foreground"
          )}
        >
          {isOwnProfile 
            ? t("performerReviews.ownerNotice")
            : t("performerReviews.businessRoleNotice")}
        </div>
      )}

      <div className={cn("flex flex-col gap-4")}>
        {loading ? (
          <div className={cn("py-8 text-center text-muted-foreground text-sm")}>
            {t("performerReviews.loading")}
          </div>
        ) : reviews.length === 0 ? (
          <div className={cn("py-8 text-center text-muted-foreground text-sm")}>
            {t("performerReviews.noReviewsPlaceholder")}
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={cn(
                "flex gap-4 items-start rounded-xl border border-border/20 bg-background p-4"
              )}
            >
              <img
                src={review.reviewer.avatar || "https://i.pravatar.cc/80"}
                alt={review.reviewer.name}
                className={cn(
                  "w-12 h-12 rounded-full object-cover border border-border/20 flex-shrink-0"
                )}
              />
              <div className={cn("flex-1 min-w-0 flex flex-col gap-2")}>
                <div className={cn("flex justify-between items-start")}>
                  <div className={cn("flex-1")}>
                    <div className={cn("flex items-center gap-2 mb-1")}>
                      <p className={cn("text-sm font-semibold text-foreground")}>
                        {review.reviewer.name || t("performerReviews.anonymous")}
                      </p>
                      {/* Badge "Đã đánh giá" nếu có BookingId (review từ booking cụ thể) */}
                      {review.BookingId && (
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          "bg-success/10 text-success border border-success/20"
                        )}>
                          ✓ Đã đánh giá
                        </span>
                      )}
                    </div>
                    {/* Thông tin booking - hiển thị theo chiều ngang giống bar review */}
                    {review.BookingDate && (
                      <div className={cn(
                        "mb-2 p-2 rounded-lg",
                        "bg-primary/5 border border-primary/20"
                      )}>
                        <p className={cn("text-xs font-semibold text-muted-foreground mb-1.5")}>
                          Thông tin đặt lịch:
                        </p>
                        <div className={cn("flex flex-wrap items-center gap-2 text-xs")}>
                          <div className={cn("flex items-center gap-1.5")}>
                            <span className={cn("text-muted-foreground font-medium")}>Ngày:</span>
                            <span className={cn("px-2 py-0.5 rounded-md bg-warning/10 text-warning font-semibold")}>
                              {new Date(review.BookingDate).toLocaleDateString("vi-VN", {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={cn("flex flex-col items-end gap-1 text-xs text-muted-foreground")}>
                    <div className={cn("flex items-center gap-0.5")}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          className={cn(
                            index < review.star
                              ? "text-warning fill-warning"
                              : "text-muted-foreground/40"
                          )}
                        />
                      ))}
                    </div>
                    <span>
                      ⭐ Đánh giá: {formatDateTime(review.createdAt)}
                    </span>
                  </div>
                </div>
                {review.comment && (
                  <p className={cn("text-sm text-foreground leading-relaxed mt-1 whitespace-pre-wrap break-words")}>
                    {review.comment}
                  </p>
                )}
                
                {/* Hiển thị ảnh feed và back nếu có */}
                {(review.Picture || review.FeedBackContent) && (
                  <div className={cn("mt-3")}>
                    {/* Kiểm tra xem có cả 2 ảnh không */}
                    {(() => {
                      const hasPicture = review.Picture && review.Picture.trim() !== '';
                      const hasFeedbackImage = review.FeedBackContent && 
                        review.FeedBackContent.trim() !== '' && 
                        (review.FeedBackContent.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
                         review.FeedBackContent.startsWith('data:image') ||
                         review.FeedBackContent.startsWith('http'));
                      
                      // Nếu có cả 2 ảnh, hiển thị cạnh nhau
                      if (hasPicture && hasFeedbackImage) {
                        return (
                          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3")}>
                            <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group")}>
                              <img
                                src={review.Picture}
                                alt="Review feed"
                                className={cn("w-full h-48 sm:h-56 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105")}
                                onClick={() => window.open(review.Picture, '_blank')}
                                onError={(e) => {
                                  console.error('[PerformerReviews] Error loading Picture:', review.Picture);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                            </div>
                            <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group")}>
                              <img
                                src={review.FeedBackContent}
                                alt="Review back"
                                className={cn("w-full h-48 sm:h-56 object-cover cursor-pointer transition-transform duration-200 group-hover:scale-105")}
                                onClick={() => window.open(review.FeedBackContent, '_blank')}
                                onError={(e) => {
                                  console.error('[PerformerReviews] Error loading FeedBackContent:', review.FeedBackContent);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                            </div>
                          </div>
                        );
                      }
                      
                      // Nếu chỉ có 1 ảnh hoặc có text, hiển thị dọc
                      return (
                        <div className={cn("flex flex-col gap-3")}>
                          {hasPicture && (
                            <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10 group")}>
                              <img
                                src={review.Picture}
                                alt="Review feed"
                                className={cn("w-full max-w-md h-auto object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]")}
                                onClick={() => window.open(review.Picture, '_blank')}
                                onError={(e) => {
                                  console.error('[PerformerReviews] Error loading Picture:', review.Picture);
                                  e.target.style.display = 'none';
                                }}
                              />
                              <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                            </div>
                          )}
                          {review.FeedBackContent && (
                            <div className={cn("relative rounded-lg overflow-hidden border border-border/20 bg-muted/10")}>
                              {/* Check if FeedBackContent is an image URL */}
                              {review.FeedBackContent.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || 
                               review.FeedBackContent.startsWith('data:image') ||
                               review.FeedBackContent.startsWith('http') ? (
                                <div className={cn("group")}>
                                  <img
                                    src={review.FeedBackContent}
                                    alt="Review back"
                                    className={cn("w-full max-w-md h-auto object-cover cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]")}
                                    onClick={() => window.open(review.FeedBackContent, '_blank')}
                                    onError={(e) => {
                                      console.error('[PerformerReviews] Error loading FeedBackContent image:', review.FeedBackContent);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                  <div className={cn("absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200")} />
                                </div>
                              ) : (
                                <p className={cn(
                                  "text-sm text-foreground p-3",
                                  "leading-relaxed whitespace-pre-wrap break-words"
                                )}>
                                  {review.FeedBackContent}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

PerformerReviews.propTypes = {
  businessAccountId: PropTypes.string,
  performerName: PropTypes.string,
  performerRole: PropTypes.string,
  isOwnProfile: PropTypes.bool,
  allowSubmission: PropTypes.bool,
};

