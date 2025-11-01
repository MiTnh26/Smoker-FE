import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import songApi from "../api/songApi";

const UploadSong = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState();
  const [title, setTitle] = useState();
  const [artist, setArtist] = useState();
  const [album, setAlbum] = useState();
  const [description, setDescription] = useState();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("album", album);
    formData.append("description", description);

    try {
      const result = await songApi.uploadSong(formData);
      // console.log(result);
      if (result?.status === "success" || result?.data?.status === "success") {
        alert("File uploaded successfully");
        navigate("/songs");
      }
    } catch (err) {
      alert("Upload failed");
    }
  };

  return (
    <div className="flex flex-col min-h-screen py-10 text-white px-5 bg-slate-800 space-y-5 pb-10 lg:p-20">
      <h1 className="text-3xl font-bold text-center lg:text-4xl">Upload Song</h1>

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="flex flex-col lg:m-5 text-xl space-y-5"
      >
        <div className="flex flex-col space-y-2 lg:px-5">
          <label className="px-2" htmlFor="title">
            Title
          </label>
          <input
            type="text"
            name="title"
            className=" px-5 text-sm bg-slate-100 border-b-blue-200 border-b-2 rounded-md text-gray-900 placeholder:text-gray-350 h-10 outline-none"
            placeholder="Enter the title name"
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col space-y-2 lg:px-5">
          <label className="px-2" htmlFor="title">
            Description
          </label>
          <input
            type="text"
            name="title"
            className=" px-5 text-sm bg-slate-100 border-b-blue-200 border-b-2 rounded-md placeholder:text-gray-350 text-gray-900  h-10 outline-none"
            placeholder="Enter the description"
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col space-y-2 lg:px-5">
          <label className="px-2" htmlFor="title">
            Artist
          </label>
          <input
            type="text"
            name="title"
            className=" px-5 text-sm bg-slate-100 border-b-blue-200 border-b-2 rounded-md placeholder:text-gray-350 text-gray-900 h-10 outline-none"
            placeholder="Enter the artist name"
            onChange={(e) => setArtist(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col space-y-2 lg:px-5">
          <label className="px-2" htmlFor="title">
            Cover Album
          </label>
          <input
            type="text"
            name="title"
            className=" px-5 text-sm bg-slate-100 border-b-blue-200 border-b-2 rounded-md placeholder:text-gray-350 text-gray-900 h-10 outline-none"
            placeholder="Enter the album name"
            onChange={(e) => setAlbum(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col space-y-2 lg:px-5">
          <label htmlFor="audioFile">Audio File</label>
          <input
            onChange={handleFileChange}
            type="file"
            name="file"
            accept="audio/*"
            required
          />
        </div>
        <button
          className="bg-[#ffd700] text-[#7d0000] text-sm  py-1 rounded-xl w-32 lg:mx-4"
          type="submit"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default UploadSong;
