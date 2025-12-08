import { useTranslation } from "react-i18next";

export default function FeedHeader() {
  const { t } = useTranslation();
  let session;
  try {
    const raw = localStorage.getItem("session");
    session = raw ? JSON.parse(raw) : null;
  } catch (e) {
    session = null;
  }

  const user = session?.account;

  return (
    <header className="feed-header p-3 flex justify-between items-center border-b rounded-xl" style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--foreground))" }}>
      <h2 className="text-xl font-semibold">{t('feed.newsfeed')}</h2>
      <div className="flex items-center gap-3">
        {/* {user && (
          <div className="flex items-center gap-2">
            <img src={user.avatar} alt={user.userName || user.email} className="w-8 h-8 rounded-full object-cover" />
            <span className="text-sm font-medium max-sm:hidden">{user.userName || user.email}</span>
          </div>
        )} */}
        {/* <button className="px-3 py-1 rounded-lg" style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-foreground))" }}>Tạo bài viết</button> */}
      </div>
    </header>
  )
}
