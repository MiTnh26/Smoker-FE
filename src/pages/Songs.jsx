import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SongCard from "./SongCard";
import songApi from "../api/songApi";

const Songs = () => {
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState(null);
  const navigate = useNavigate();

  // Hàm fetchSongs để truyền xuống SongCard
  const fetchSongs = async () => {
    setLoading(true);
    try {
      const response = await songApi.getSongs();
      const data = response?.data || response;
      const songList = (data?.songs || data || []).map((song) => ({
        ...song,
        artist: song.artist || song.artistName || "",
      }));
      setSongs(songList);
    } catch (err) {
      setSongs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  return (
    <div className="bg-gray-900 p-5 space-y-2 min-h-screen">
      <div className="flex justify-end mb-4">
        <button
          className="bg-yellow-400 text-red-900 font-bold px-4 py-2 rounded hover:bg-yellow-300 transition"
          onClick={() => navigate("/upload-song")}
        >
          Upload Song
        </button>
      </div>
      {loading && songs == null ? (
        <div>loading...</div>
      ) : !loading && songs != null ? (
        songs.map((song, index) => (
          <SongCard
            key={song._id || song.id || index}
            title={song.title}
            artistName={song.artist}
            songSrc={song.song}
            userId={song.uploadedBy}
            songId={song._id || song.id}
            file={song.file}
            onDeleted={fetchSongs}
          />
        ))
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default Songs;
