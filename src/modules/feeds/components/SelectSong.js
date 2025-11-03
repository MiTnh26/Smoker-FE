// SelectSong.js
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function SelectSong({ value, onChange }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [search, setSearch] = useState("");
  const audioRef = useRef(null);
  const __URL__ = "http://localhost:9999";

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      const { data } = await axios.get(`${__URL__}/api/song`);
      setSongs(data["songs"]);
      setLoading(false);
    };
    fetchSongs();
  }, []);

  const handlePlayPause = (item) => {
    // Nếu đang play bài này thì pause
    if (playingId === item._id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    // Nếu đang play bài khác thì dừng lại
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new window.Audio(`${__URL__}/api/song/stream/${item.song}`);
    audioRef.current = audio;
    audio.play();
    setPlayingId(item._id);
    audio.onended = () => setPlayingId(null);
  };

  // Lọc danh sách theo search
  const filteredSongs = songs.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.artistName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: "100%" }}>
      <label style={{ fontWeight: 500, color: "#444", marginBottom: 6, display: "block" }}>Chọn nhạc từ thư viện</label>
      <input
        type="text"
        placeholder="Tìm kiếm tên bài hát hoặc nghệ sĩ..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          border: "1px solid #ccc",
          borderRadius: 8,
          marginBottom: 10,
          fontSize: 15
        }}
      />
      {loading ? (
        <div style={{ padding: 12, color: "#888" }}>Đang tải danh sách nhạc...</div>
      ) : (
        <div style={{
          maxHeight: 220,
          overflowY: "auto",
          border: "1px solid #eee",
          borderRadius: 12,
          marginBottom: 8,
          background: "#fafaff"
        }}>
          {filteredSongs.length === 0 && (
            <div style={{ padding: 16, color: "#aaa", textAlign: "center" }}>Không tìm thấy bài hát phù hợp</div>
          )}
          {filteredSongs.map((item) => (
            <div
              key={item._id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: 10,
                borderBottom: "1px solid #f0f0f0",
                background: playingId === item._id ? "#e6e6ff" : value === item._id ? "#f0f7ff" : "#fff",
                borderRadius: 10,
                transition: "background 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={e => e.currentTarget.style.background = playingId === item._id ? "#e6e6ff" : "#f5f5fa"}
              onMouseLeave={e => e.currentTarget.style.background = playingId === item._id ? "#e6e6ff" : value === item._id ? "#f0f7ff" : "#fff"}
            >
              <input
                type="radio"
                checked={value === item._id}
                onChange={() => onChange(item._id)}
                style={{ marginRight: 10 }}
              />
              <span style={{ flex: 1, fontWeight: value === item._id ? 600 : 400, color: "#333" }}>{item.title} - {item.artistName}</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handlePlayPause(item); }}
                style={{ marginLeft: 10, background: playingId === item._id ? "#6c47ff" : "#eee", color: playingId === item._id ? "#fff" : "#444", border: "none", borderRadius: 6, padding: "2px 12px", cursor: "pointer", fontSize: 16, fontWeight: 600 }}
              >
                {playingId === item._id ? "⏸" : "▶"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}