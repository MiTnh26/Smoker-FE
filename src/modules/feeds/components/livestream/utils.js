export function getSessionUser() {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return null;
    const session = JSON.parse(raw);
    const account = session?.account || session?.user || {};
    return {
      id: account?.id || session?.userId || account?.AccountId || null,
      name: account?.fullName || account?.UserName || account?.userName || "User",
      avatar: account?.avatar || account?.Avatar || "",
    };
  } catch {
    return null;
  }
}

