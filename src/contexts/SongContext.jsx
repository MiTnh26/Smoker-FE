import { createContext, useState, useRef } from "react";

export const SongContext = createContext();

export const SongContextState = ({ children }) => {
  // Use environment variable or fallback to localhost
  const getBaseUrl = () => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:9999/api";
    // Remove /api suffix if present to get base URL
    return apiUrl.replace(/\/api\/?$/, "");
  };

  const __URL__ = getBaseUrl();
  const audio = new Audio();
  const song = {
    songUrl: "",
    songName: "",
    songArtist: "",
    songAlbum: "",
    isPlaying: false,

    setSongUrl: (url) => {
      song.songUrl = url;
    },
    setSongName: (name) => {
      song.songName = name;
    },
    setArtistName: (name) => {
      song.songArtist = name;
    },
    setAlbumName: (name) => song.songAlbum = name,
    setIsPlaying: (val) => {
      song.isPlaying = val
    },

  };

  return <SongContext.Provider value={{ audio, song, __URL__ }}>{children}</SongContext.Provider>;
};
