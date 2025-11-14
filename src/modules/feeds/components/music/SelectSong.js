// SelectSong.js
import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause } from "lucide-react";
import axios from "axios";

export default function SelectSong({ value, onChange }) {
  const { t } = useTranslation();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [search, setSearch] = useState("");
  const audioRef = useRef(null);
  const __URL__ = "http://localhost:9999";

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${__URL__}/api/song`);
      setSongs(data["songs"] || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="w-full">
      <input
        type="text"
        placeholder={t('story.searchSongPlaceholder') || 'Search song name or artist...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-lg border-[0.5px] border-border/20 bg-input px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/20 mb-3"
      />
      {loading ? (
        <div className="py-3 text-center text-sm text-muted-foreground">
          {t('story.loadingSongs') || 'Loading songs...'}
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto rounded-lg border-[0.5px] border-border/20 bg-card">
          {filteredSongs.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t('story.noSongsFound') || 'No songs found'}
            </div>
          )}
          {filteredSongs.map((item) => {
            const isPlaying = playingId === item._id;
            const isSelected = value === item._id;
            return (
              <div
                key={item._id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                  isPlaying 
                    ? 'bg-primary/20' 
                    : isSelected 
                      ? 'bg-primary/10' 
                      : 'hover:bg-muted/50'
                } ${isSelected ? 'border-l-2 border-l-primary' : ''}`}
                onClick={() => onChange?.(item._id, item)}
              >
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => onChange?.(item._id, item)}
                  className="h-4 w-4 cursor-pointer accent-primary"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={`flex-1 text-sm ${isSelected ? 'font-semibold text-foreground' : 'font-normal text-foreground'}`}>
                  {item.title} - {item.artistName}
                </span>
                <button
                  type="button"
                  onClick={e => { 
                    e.stopPropagation(); 
                    handlePlayPause(item); 
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isPlaying 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {isPlaying ? (
                    <Pause size={14} className="fill-current" />
                  ) : (
                    <Play size={14} className="fill-current" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}