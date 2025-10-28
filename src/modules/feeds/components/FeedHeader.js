export default function FeedHeader() {
  return (
    <header className="feed-header p-4 flex justify-between items-center border-b" style={{ background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--foreground))" }}>
      <h2 className="text-xl font-semibold">Bảng tin</h2>
      <button className="px-3 py-1 rounded-lg" style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-foreground))" }}>Tạo bài viết</button>
    </header>
  )
}
