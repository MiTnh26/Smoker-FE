import React, { useState, useRef } from "react";
import SelectSong from "./SelectSong";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import getCroppedImg from "./utils/cropImage";
import { createStory } from "../../../api/storyApi";

export default function StoryEditor({ onStoryCreated, onClose }) {
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState(null);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputFileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleMusicUpload = (e) => {
    setMusic(e.target.files[0]);
  };

  const onCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    let croppedFile = file;
    if (imageUrl && croppedAreaPixels) {
      croppedFile = await getCroppedImg(imageUrl, croppedAreaPixels);
    }
    const formData = new FormData();
    formData.append("title", "Story mới");
    formData.append("content", caption);
    formData.append("expiredAt", new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,16));
    formData.append("images", croppedFile);
    formData.append("type", "story");
    if (music) formData.append("music", music);
    if (selectedSongId) formData.append("songId", selectedSongId);
    try {
      const res = await createStory(formData);
      if (res && res.data && res.data.data) {
        onStoryCreated(res.data.data);
      }
      setFile(null);
      setCaption("");
      setMusic(null);
      setImageUrl("");
      setSelectedSongId("");
      if (onClose) onClose();
    } catch (err) {
      alert("Tạo story thất bại!");
    }
    setLoading(false);
  };

  return (
    <div className="story-editor-modal" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7fa' }}>
      <div className="story-editor-content" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #0001', padding: 32, maxWidth: 420, width: '100%' }}>
        <h2 style={{ textAlign: 'center', color: '#6c47ff', marginBottom: 24 }}>Tạo Story mới</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ fontWeight: 500, color: '#444' }}>Chọn ảnh hoặc video</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={inputFileRef}
            style={{ display: 'none' }}
          />
          {!imageUrl && (
            <button onClick={() => inputFileRef.current.click()} style={{ padding: '16px 0', border: '2px dashed #bbb', borderRadius: 12, background: '#fafaff', color: '#888', fontWeight: 500, fontSize: 18, cursor: 'pointer' }}>
              + Chọn ảnh
            </button>
          )}
          {imageUrl && (
            <div style={{ position: 'relative', width: '100%', maxWidth: 320, height: 420, background: '#222', margin: '0 auto', borderRadius: 12, overflow: 'hidden' }}>
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={9/16}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <div style={{ marginTop: 12 }}>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.01}
                  onChange={(_, value) => setZoom(value)}
                />
              </div>
              <button onClick={() => { setFile(null); setImageUrl(""); }} style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontWeight: 700, fontSize: 18, color: '#d00', cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}>×</button>
            </div>
          )}
          <label style={{ fontWeight: 500, color: '#444' }}>Caption</label>
          <input
            type="text"
            placeholder="Nhập caption cho story..."
            value={caption}
            onChange={e => setCaption(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, marginBottom: 0, fontSize: 16 }}
          />
          {/* <label style={{ fontWeight: 500, color: '#444' }}>Chọn nhạc (tùy chọn)</label> */}
          <div style={{ marginTop: 8 }}>
            <SelectSong value={selectedSongId} onChange={setSelectedSongId} />
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleSubmit} disabled={loading || !file} style={{ background: '#6c47ff', color: '#fff', fontWeight: 600, fontSize: 17, border: 'none', borderRadius: 8, padding: '12px 32px', cursor: loading || !file ? 'not-allowed' : 'pointer', opacity: loading || !file ? 0.7 : 1 }}>
              {loading ? "Đang đăng..." : "Đăng story"}
            </button>
            {onClose && <button onClick={onClose} style={{ background: '#eee', color: '#444', fontWeight: 500, border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer' }}>Hủy</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
