import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import SongCard from "./SongCard";
import { SongContext } from "../contexts/SongContext";

const Songs = () => {
  const {__URL__} = useContext(SongContext)
  
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState(null);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      const { data } = await axios.get(`${__URL__}/api/song`);
      setSongs(data["songs"]);
      setLoading(false);
    };
    fetchSongs();
  }, []);
 
  // No sidebar context, so no closeMenu

  return (
    <div className="bg-gray-900 p-5 space-y-2 min-h-screen">
      {loading && songs == null ? (
        <div>loading...</div>
      ) : !loading && songs != null ? (
        songs.map((song,index) => {
          return (
            <SongCard
              key={song._id}
              title={song.title}
              artistName={song.artist}
              songSrc={song.song}
              userId={song.uploadedBy}
              songId = {song._id}
              file = {song.file}
            />
          );
        })
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default Songs;
