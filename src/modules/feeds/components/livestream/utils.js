export function getSessionUser() {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    const session = JSON.parse(raw);
    const account = session?.account || session?.user || {};
    const activeEntity = session?.activeEntity || account;
    
    return {
      id: account?.id || session?.userId || account?.AccountId || null,
      name: activeEntity?.name || activeEntity?.userName || activeEntity?.UserName || activeEntity?.barName || activeEntity?.BarName || activeEntity?.fullName || account?.fullName || account?.UserName || account?.userName || "User",
      avatar: activeEntity?.avatar || activeEntity?.Avatar || account?.avatar || account?.Avatar || "",
      entityAccountId: activeEntity?.EntityAccountId || activeEntity?.entityAccountId || null,
    };
  } catch {
    return null;
  }
}

