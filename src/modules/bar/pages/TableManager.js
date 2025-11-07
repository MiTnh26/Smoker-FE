// import React, { useEffect, useState, useCallback, useRef } from "react";
// import { useParams } from "react-router-dom";
// import { useTranslation } from "react-i18next";
// import { motion, AnimatePresence } from "framer-motion";
// import barPageApi from "../../../api/barPageApi";
// import { ToastContainer } from "../../../components/common/Toast";
// import { SkeletonCard } from "../../../components/common/Skeleton";

// // Table Icon SVG Component
// const TableIcon = ({ className = "" }) => {
//   return (
//     <svg
//       className={className}
//       width="60"
//       height="60"
//       viewBox="0 0 60 60"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       style={{ color: "rgb(var(--primary))" }}
//     >
//       {/* Table top */}
//       <rect
//         x="10"
//         y="15"
//         width="40"
//         height="30"
//         rx="4"
//         fill="currentColor"
//         fillOpacity="0.2"
//         stroke="currentColor"
//         strokeWidth="2"
//       />
//       {/* Table legs */}
//       <line
//         x1="18"
//         y1="45"
//         x2="18"
//         y2="50"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//       />
//       <line
//         x1="42"
//         y1="45"
//         x2="42"
//         y2="50"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//       />
//       <line
//         x1="18"
//         y1="50"
//         x2="42"
//         y2="50"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// };

// export default function TableManager() {
//   const { t } = useTranslation();
//   const { barPageId } = useParams();
//   const [tableApplies, setTableApplies] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [toasts, setToasts] = useState([]);
//   const [exitingCards, setExitingCards] = useState(new Set());
//   const inputRefs = useRef({});

//   // Toast management
//   const addToast = useCallback((message, type = "info", duration = 3000) => {
//     const id = Date.now() + Math.random();
//     setToasts((prev) => [...prev, { id, message, type, duration }]);
//   }, []);

//   const removeToast = useCallback((id) => {
//     setToasts((prev) => prev.filter((toast) => toast.id !== id));
//   }, []);

//   // Load data
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const res = await barPageApi.getTableApplies(barPageId);
//         setTableApplies(res.data || []);
//       } catch (err) {
//         console.error("❌ Lỗi tải TableApply:", err);
//         addToast(t("bar.cannotLoadTableApplies"), "error");
//       } finally {
//         setLoading(false);
//       }
//     };
//     if (barPageId) {
//       fetchData();
//     }
//   }, [barPageId, t, addToast]);

//   // Add new TableApply
//   const addApply = () => {
//     const newId = `new-${Date.now()}-${Math.random()}`;
//     setTableApplies((prev) => [
//       ...prev,
//       {
//         TableApplyId: null,
//         name: "",
//         dirty: true,
//         _tempId: newId,
//       },
//     ]);
//     // Auto-focus the new input after a short delay
//     setTimeout(() => {
//       const input = inputRefs.current[newId];
//       if (input) input.focus();
//     }, 100);
//   };

//   // Update TableApply
//   const updateApply = (index, field, value) => {
//     setTableApplies((prev) => {
//       const updated = [...prev];
//       updated[index] = { ...updated[index], [field]: value, dirty: true };
//       return updated;
//     });
//   };

//   // Save all changes
//   const saveAll = async () => {
//     const dirtyItems = tableApplies.filter((t) => t.dirty);
//     if (!dirtyItems.length) {
//       addToast(t("bar.noChangesToSave"), "warning");
//       return;
//     }

//     try {
//       setSaving(true);
//       // Update existing items
//       for (const apply of dirtyItems.filter((x) => x.TableApplyId)) {
//         await barPageApi.updateTableApply(apply.TableApplyId, {
//           name: apply.name,
//         });
//       }

//       // Create new items
//       const newOnes = dirtyItems.filter((x) => !x.TableApplyId);
//       for (const apply of newOnes) {
//         await barPageApi.createTableApply({ name: apply.name, barPageId });
//       }

//       // Reload data
//       const res = await barPageApi.getTableApplies(barPageId);
//       setTableApplies(res.data || []);

//       addToast(t("bar.saved"), "success");
//     } catch (err) {
//       console.error("❌ Lỗi khi lưu TableApply:", err);
//       addToast(t("bar.errorSavingTableApply"), "error");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // Delete TableApply
//   const deleteApply = async (id, index) => {
//     if (!globalThis.confirm(t("bar.confirmDeleteTableApply"))) return;

//     const cardId = id || tableApplies[index]?._tempId || `temp-${index}`;
//     // Mark card as exiting for animation
//     setExitingCards((prev) => new Set(prev).add(cardId));

//     const removeCard = () => {
//       setTableApplies((prev) => prev.filter((_, i) => i !== index));
//       setExitingCards((prev) => {
//         const next = new Set(prev);
//         next.delete(cardId);
//         return next;
//       });
//     };

//     const clearExitingState = () => {
//       setExitingCards((prev) => {
//         const next = new Set(prev);
//         next.delete(cardId);
//         return next;
//       });
//     };

//     try {
//       if (id) {
//         await barPageApi.deleteTableApply(id);
//       }

//       // Wait for animation to complete
//       setTimeout(removeCard, 300);

//       addToast(t("bar.tableApplyDeleted"), "success");
//     } catch (err) {
//       console.error("❌ Lỗi khi xóa TableApply:", err);
//       clearExitingState();
//       addToast(t("bar.cannotDeleteTableApply"), "error");
//     }
//   };

//   // Loading state with skeleton
//   if (loading) {
//     return (
//       <div className="max-w-7xl mx-auto p-8 bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {[1, 2, 3, 4].map((i) => (
//             <SkeletonCard key={`skeleton-${i}`} />
//           ))}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto p-8 bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
//       <ToastContainer toasts={toasts} removeToast={removeToast} />

//       {/* Header Section */}
//       <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8 p-6 bg-[rgb(var(--card))] border border-[rgba(var(--border),0.3)] rounded-2xl shadow-sm">
//         <div className="flex-1">
//           <h1 className="text-3xl font-semibold text-[rgb(var(--foreground))] mb-2">
//             {t("bar.tableManagerTitle")}
//           </h1>
//           <p className="text-sm text-[rgb(var(--muted-foreground))]">
//             {t("bar.tableManagerDescription")}
//           </p>
//         </div>
//         <div className="flex gap-3 flex-shrink-0">
//           <button
//             onClick={addApply}
//             className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] border border-[rgba(var(--primary),0.3)] hover:bg-[rgba(var(--primary),0.9)] hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
//           >
//             ➕ {t("bar.addTableApply")}
//           </button>
//           <button
//             onClick={saveAll}
//             disabled={saving || !tableApplies.some((t) => t.dirty)}
//             className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-[rgb(var(--card))] text-[rgb(var(--foreground))] border border-[rgba(var(--border),0.5)] hover:bg-[rgba(var(--muted),0.3)] hover:border-[rgba(var(--primary),0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all ${
//               saving ? "relative text-transparent" : ""
//             }`}
//           >
//             {saving ? (
//               <>
//                 <span className="absolute inset-0 flex items-center justify-center">
//                   <div className="w-4 h-4 border-2 border-[rgba(var(--foreground),0.3)] border-t-[rgb(var(--foreground))] rounded-full animate-spin"></div>
//                 </span>
//                 {t("bar.saving")}
//               </>
//             ) : (
//               `💾 ${t("bar.saveAll")}`
//             )}
//           </button>
//         </div>
//       </div>

//       {/* Empty State */}
//       {tableApplies.length === 0 && !loading && (
//         <div className="flex flex-col items-center justify-center py-16 text-center">
//           <div className="mb-4 opacity-50">
//             <TableIcon />
//           </div>
//           <p className="text-lg text-[rgb(var(--muted-foreground))]">
//             {t("bar.noTables")}
//           </p>
//         </div>
//       )}

//       {/* Table Cards Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//         <AnimatePresence>
//           {tableApplies.map((t, i) => {
//             const cardId = t.TableApplyId || t._tempId || `temp-${i}`;
//             const isExiting = exitingCards.has(cardId);

//             return (
//               <motion.div
//                 key={cardId}
//                 initial={{ opacity: 0, x: -20 }}
//                 animate={
//                   isExiting
//                     ? { opacity: 0, scale: 0.8 }
//                     : { opacity: 1, x: 0, scale: 1 }
//                 }
//                 exit={{ opacity: 0, scale: 0.8 }}
//                 transition={{ duration: 0.3 }}
//                 className={`relative flex flex-col gap-4 p-5 bg-[rgb(var(--card))] border border-[rgba(var(--border),0.6)] rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-[rgba(var(--primary),0.3)] transition-all ${
//                   isExiting ? "pointer-events-none" : ""
//                 }`}
//               >
//                 {/* Unsaved indicator */}
//                 {t.dirty && (
//                   <div className="absolute top-3 right-3 w-2 h-2 bg-[rgb(var(--warning))] rounded-full animate-pulse shadow-lg shadow-[rgba(var(--warning),0.5)]"></div>
//                 )}

//                 {/* Table Icon */}
//                 <div className="flex justify-center">
//                   <div className="group cursor-pointer">
//                     <TableIcon className="transition-all group-hover:drop-shadow-[0_0_12px_rgba(var(--primary),0.6)] group-hover:scale-110" />
//                   </div>
//                 </div>

//                 {/* Name Input */}
//                 <input
//                   ref={(el) => {
//                     if (el) inputRefs.current[cardId] = el;
//                   }}
//                   type="text"
//                   value={t.name || ""}
//                   placeholder={t("bar.tableApplyNamePlaceholder")}
//                   onChange={(e) => updateApply(i, "name", e.target.value)}
//                   className="w-full px-4 py-2.5 text-sm bg-[rgba(var(--input),0.2)] border border-[rgba(var(--border),0.2)] rounded-xl text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))] focus:outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgba(var(--primary),0.1)] focus:bg-[rgb(var(--input))] transition-all"
//                 />

//                 {/* Status and Actions */}
//                 <div className="flex justify-between items-center mt-2">
//                   <div
//                     className={`flex items-center gap-2 text-xs ${
//                       t.dirty
//                         ? "text-[rgb(var(--warning))]"
//                         : "text-[rgb(var(--success))]"
//                     }`}
//                   >
//                     {t.dirty ? (
//                       <>🟡 {t("bar.statusEditing")}</>
//                     ) : (
//                       <>✅ {t("bar.statusSaved")}</>
//                     )}
//                   </div>
//                   {t.TableApplyId && (
//                     <button
//                       onClick={() => deleteApply(t.TableApplyId, i)}
//                       className="px-4 py-2 text-sm bg-transparent border border-[rgba(var(--border),0.5)] rounded-lg text-[rgb(var(--muted-foreground))] hover:border-[rgba(var(--danger),0.4)] hover:text-[rgb(var(--danger))] hover:bg-[rgba(var(--danger),0.1)] active:scale-95 transition-all"
//                     >
//                       {t("bar.delete")}
//                     </button>
//                   )}
//                 </div>
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }
