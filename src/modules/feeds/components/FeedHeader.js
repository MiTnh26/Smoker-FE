import { Home, Search, Bell, User } from "lucide-react"

export default function FeedHeader() {
  return (
    <header className="feed-header">
      <div className="logo">🍹 NightLife</div>
      <div className="search-bar">
        <Search size={18} />
        <input type="text" placeholder="Tìm kiếm sự kiện, địa điểm..." />
      </div>
      <div className="header-icons">
        <Bell size={22} />
        <User size={22} />
      </div>
    </header>
  )
}
