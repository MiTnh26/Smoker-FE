import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { cn } from "../../../utils/cn";
import "swiper/css";
import "swiper/css/pagination";
import barEventApi from "../../../api/barEventApi";
import AddEventModal from "../components/AddEventModal";
import EditEventModal from "../components/EditEventModal";
import { Button } from "../../../components/common/Button";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function EventsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0); // 0: Other bars, 1: Manage
  const [otherBarsEvents, setOtherBarsEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barPageId, setBarPageId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);

  // Get barPageId from session
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("session")) || {};
      const activeEntity = session.activeEntity || {};
      const entities = session.entities || [];
      
      const currentBar = entities.find(
        (e) => String(e.id) === String(activeEntity.id)
      ) || activeEntity;
      
      if (currentBar?.id) {
        setBarPageId(currentBar.id);
      }
    } catch (err) {
      console.error("Error loading session:", err);
    }
  }, []);

  // Fetch events
  useEffect(() => {
    if (barPageId) {
      fetchAllEvents();
    }
  }, [barPageId]);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch my events
      const myRes = await barEventApi.getEventsByBarId(barPageId);
      const myEventsData = myRes.status === "success" 
        ? (myRes.data || [])
        : (Array.isArray(myRes.data) ? myRes.data : []);
      setMyEvents(myEventsData);

      // Try to fetch all events, then filter out mine
      // If API doesn't exist, we'll use a fallback
      try {
        const allRes = await barEventApi.getAllEvents();
        const allEvents = allRes.status === "success"
          ? (allRes.data || [])
          : (Array.isArray(allRes.data) ? allRes.data : []);
        
        // Filter out events from current bar
        const otherEvents = allEvents.filter(
          (ev) => String(ev.BarPageId) !== String(barPageId)
        );
        setOtherBarsEvents(otherEvents);
      } catch (err) {
        // If getAllEvents doesn't exist, try excluding endpoint
        try {
          const excludeRes = await barEventApi.getEventsExcludingBar(barPageId);
          const excludeEvents = excludeRes.status === "success"
            ? (excludeRes.data || [])
            : (Array.isArray(excludeRes.data) ? excludeRes.data : []);
          setOtherBarsEvents(excludeEvents);
        } catch (excludeErr) {
          // If both fail, just show empty for now
          console.warn("Could not fetch other bars events:", excludeErr);
          setOtherBarsEvents([]);
        }
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setMyEvents([]);
      setOtherBarsEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatus = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return { label: t("bar.upcoming"), color: "bg-blue-500" };
    if (now >= startDate && now <= endDate)
      return { label: t("bar.ongoing"), color: "bg-green-500" };
    return { label: t("bar.ended"), color: "bg-gray-500" };
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchAllEvents();
  };

  const handleEditClick = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingEvent(null);
    fetchAllEvents();
  };

  const handleDeleteClick = async (eventId) => {
    if (!window.confirm(t("bar.eventsPage.confirmDelete"))) {
      return;
    }

    try {
      setDeletingEventId(eventId);
      const res = await barEventApi.deleteEvent(eventId);
      if (res.status === "success") {
        alert(t("bar.eventsPage.eventDeleted"));
        fetchAllEvents();
      } else {
        alert(res.message || t("bar.eventsPage.errorDelete"));
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert(t("bar.eventsPage.errorDelete"));
    } finally {
      setDeletingEventId(null);
    }
  };

  // Render event card for management tab
  const renderEventCard = (ev) => {
    const status = getStatus(ev.StartTime, ev.EndTime);
    return (
      <div
        key={ev.EventId}
        className={cn(
          "relative rounded-lg overflow-hidden",
          "bg-card border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
          "transition-shadow duration-200"
        )}
      >
        <div className={cn("relative h-48 overflow-hidden")}>
          <img
            src={ev.Picture || "https://placehold.co/600x400?text=No+Image"}
            alt={ev.EventName}
            className={cn("w-full h-full object-cover")}
            loading="lazy"
          />
          <div className={cn(
            "absolute inset-0",
            "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          )} />
          
          {/* Status Badge */}
          <div className={cn(
            "absolute top-3 right-3",
            "backdrop-blur-md bg-black/60 rounded-lg",
            "px-3 py-1.5 border border-white/20"
          )}>
            <span className={cn(
              "inline-flex items-center gap-1.5",
              "text-xs font-semibold text-white"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                status.color === "bg-blue-500" && "bg-blue-400",
                status.color === "bg-green-500" && "bg-green-400",
                status.color === "bg-gray-500" && "bg-gray-400",
                "animate-pulse"
              )} />
              {status.label}
            </span>
          </div>

          {/* Action Buttons */}
          <div className={cn(
            "absolute bottom-3 right-3 flex gap-2"
          )}>
            <button
              onClick={() => handleEditClick(ev)}
              className={cn(
                "p-2 rounded-lg",
                "bg-primary/90 hover:bg-primary",
                "text-primary-foreground",
                "backdrop-blur-sm",
                "transition-colors"
              )}
              title={t("bar.eventsPage.editEvent")}
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDeleteClick(ev.EventId)}
              disabled={deletingEventId === ev.EventId}
              className={cn(
                "p-2 rounded-lg",
                "bg-danger/90 hover:bg-danger",
                "text-white",
                "backdrop-blur-sm",
                "transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title={t("bar.eventsPage.deleteEvent")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className={cn("p-4 space-y-2")}>
          <h4 className={cn(
            "text-lg font-bold text-foreground",
            "line-clamp-1"
          )}>
            {ev.EventName}
          </h4>
          {ev.Description && (
            <p className={cn(
              "text-sm text-muted-foreground",
              "line-clamp-2"
            )}>
              {ev.Description}
            </p>
          )}
          <div className={cn("flex flex-col gap-1 text-xs text-muted-foreground")}>
            <div className={cn("flex items-center gap-1")}>
              <span>{t("bar.startTime")}</span>
              <span className={cn("font-medium")}>{formatDate(ev.StartTime)}</span>
            </div>
            <div className={cn("flex items-center gap-1")}>
              <span>{t("bar.endTime")}</span>
              <span className={cn("font-medium")}>{formatDate(ev.EndTime)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render other bars events (similar to BarEvent component)
  const renderOtherBarsEvents = () => {
    if (loading) {
      return (
        <div className={cn("w-full py-12 flex items-center justify-center")}>
          <p className={cn("text-muted-foreground")}>{t("bar.loadingEvents")}</p>
        </div>
      );
    }

    if (otherBarsEvents.length === 0) {
      return (
        <div className={cn(
          "w-full py-12 flex items-center justify-center",
          "bg-card rounded-lg border-[0.5px] border-border/20"
        )}>
          <p className={cn("text-muted-foreground")}>{t("bar.eventsPage.noOtherEvents")}</p>
        </div>
      );
    }

    return (
      <div className={cn(
        "relative w-full h-[400px] md:h-[500px] lg:h-[600px]",
        "overflow-hidden rounded-lg",
        "bg-card border-[0.5px] border-border/20",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
      )}>
        <Swiper
          spaceBetween={0}
          autoplay={otherBarsEvents.length > 1 ? { delay: 4000 } : false}
          pagination={{ clickable: true }}
          loop={otherBarsEvents.length > 1}
          modules={[Autoplay, Pagination]}
          className={cn("w-full h-full")}
        >
          {otherBarsEvents.map((ev) => {
            const status = getStatus(ev.StartTime, ev.EndTime);
            return (
              <SwiperSlide key={ev.EventId}>
                <div className={cn("relative w-full h-full overflow-hidden")}>
                  <img
                    src={ev.Picture || "https://placehold.co/1200x600?text=No+Image"}
                    alt={ev.EventName}
                    className={cn("w-full h-full object-cover bg-muted")}
                    loading="lazy"
                  />

                  <div className={cn(
                    "absolute inset-0",
                    "bg-gradient-to-t from-black via-black/60 via-black/30 to-transparent"
                  )} />
                  <div className={cn(
                    "absolute inset-0",
                    "bg-gradient-to-b from-black/20 via-transparent to-black/80"
                  )} />

                  <div className={cn(
                    "absolute inset-0 flex flex-col justify-between",
                    "p-5 md:p-6 lg:p-7 text-white z-10"
                  )}>
                    <div className={cn("flex items-center justify-between gap-3")}>
                      <div className={cn("flex-1")}>
                        <h4 className={cn(
                          "text-3xl md:text-4xl lg:text-5xl font-extrabold",
                          "leading-tight tracking-tight",
                          "text-white",
                          "drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                        )}>
                          {ev.EventName}
                        </h4>
                      </div>
                      
                      <div className={cn(
                        "flex-shrink-0",
                        "backdrop-blur-md bg-black/40 rounded-lg",
                        "px-3 py-1.5 border border-white/20",
                        "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
                        "self-start mt-1"
                      )}>
                        <span className={cn(
                          "inline-flex items-center justify-center gap-1.5",
                          "text-xs md:text-sm font-semibold",
                          "text-white whitespace-nowrap"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            status.color === "bg-blue-500" && "bg-blue-400",
                            status.color === "bg-green-500" && "bg-green-400",
                            status.color === "bg-gray-500" && "bg-gray-400",
                            "animate-pulse"
                          )} />
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className={cn("space-y-3")}>
                      {ev.Description && (
                        <div className={cn(
                          "max-w-xl",
                          "backdrop-blur-sm bg-black/25 rounded-lg",
                          "px-4 py-3 border border-white/10",
                          "shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
                        )}>
                          <p className={cn(
                            "text-sm md:text-base",
                            "leading-relaxed",
                            "text-white/90",
                            "line-clamp-2",
                            "drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                          )}>
                            {ev.Description}
                          </p>
                        </div>
                      )}

                      <div className={cn(
                        "flex flex-col md:flex-row gap-2.5 md:gap-3",
                        "backdrop-blur-md bg-black/45 rounded-lg",
                        "px-4 py-3 border border-white/15",
                        "shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                      )}>
                        <div className={cn("flex items-center gap-2.5 flex-1")}>
                          <div className={cn(
                            "w-8 h-8 rounded-lg",
                            "bg-white/10 backdrop-blur-sm",
                            "flex items-center justify-center",
                            "border border-white/20"
                          )}>
                            <i className="bx bx-calendar text-base text-white"></i>
                          </div>
                          <div className={cn("flex-1 min-w-0")}>
                            <p className={cn(
                              "text-[10px] md:text-xs font-medium",
                              "text-white/60 mb-0.5",
                              "uppercase tracking-wider"
                            )}>
                              {t("bar.startTime")}
                            </p>
                            <p className={cn(
                              "text-xs md:text-sm font-semibold",
                              "text-white",
                              "drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                              "truncate"
                            )}>
                              {formatDate(ev.StartTime)}
                            </p>
                          </div>
                        </div>

                        <div className={cn("hidden md:block w-px bg-white/15")} />

                        <div className={cn("flex items-center gap-2.5 flex-1")}>
                          <div className={cn(
                            "w-8 h-8 rounded-lg",
                            "bg-white/10 backdrop-blur-sm",
                            "flex items-center justify-center",
                            "border border-white/20"
                          )}>
                            <i className="bx bx-time-five text-base text-white"></i>
                          </div>
                          <div className={cn("flex-1 min-w-0")}>
                            <p className={cn(
                              "text-[10px] md:text-xs font-medium",
                              "text-white/60 mb-0.5",
                              "uppercase tracking-wider"
                            )}>
                              {t("bar.endTime")}
                            </p>
                            <p className={cn(
                              "text-xs md:text-sm font-semibold",
                              "text-white",
                              "drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
                              "truncate"
                            )}>
                              {formatDate(ev.EndTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    );
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6")}>
      {/* Page Header */}
      <div className={cn("mb-6")}>
        <h1 className={cn(
          "text-2xl md:text-3xl font-bold text-foreground"
        )}>
          {t("bar.eventsPage.title")}
        </h1>
      </div>

      {/* Tabs */}
      <div className={cn(
        "flex gap-2 mb-6",
        "border-b border-border/20"
      )}>
        <button
          onClick={() => setActiveTab(0)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            "border-b-2",
            activeTab === 0
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("bar.eventsPage.tabOtherBars")}
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            "border-b-2",
            activeTab === 1
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("bar.eventsPage.tabManage")}
        </button>
      </div>

      {/* Tab Content */}
      <div className={cn("mt-6")}>
        {activeTab === 0 ? (
          renderOtherBarsEvents()
        ) : (
          <div className={cn("space-y-4")}>
            {/* Create Button */}
            <div className={cn("flex justify-end")}>
              <Button
                onClick={() => setShowAddModal(true)}
                className={cn(
                  "flex items-center gap-2",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90"
                )}
              >
                <Plus size={18} />
                {t("bar.eventsPage.createEvent")}
              </Button>
            </div>

            {/* Events Grid */}
            {loading ? (
              <div className={cn("w-full py-12 flex items-center justify-center")}>
                <p className={cn("text-muted-foreground")}>{t("bar.loadingEvents")}</p>
              </div>
            ) : myEvents.length === 0 ? (
              <div className={cn(
                "w-full py-12 flex items-center justify-center",
                "bg-card rounded-lg border-[0.5px] border-border/20"
              )}>
                <p className={cn("text-muted-foreground")}>{t("bar.noEvents")}</p>
              </div>
            ) : (
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              )}>
                {myEvents.map((ev) => renderEventCard(ev))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && barPageId && (
        <AddEventModal
          barPageId={barPageId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {showEditModal && editingEvent && barPageId && (
        <EditEventModal
          event={editingEvent}
          barPageId={barPageId}
          onClose={() => {
            setShowEditModal(false);
            setEditingEvent(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

