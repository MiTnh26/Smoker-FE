import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import SelectSong from "../music/SelectSong";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import getCroppedImg from "../utils/cropImage";
import { createStory } from "../../../../api/storyApi";
import "../../../../styles/modules/feeds/story/StoryEditor.css";

export default function StoryEditor({ onStoryCreated, onClose }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedSongId, setSelectedSongId] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'text', 'music', 'alternative'
  const [songListKey, setSongListKey] = useState(0); // Key để force refresh SelectSong
  const [userInfo, setUserInfo] = useState({ name: '', avatar: '' });
  const inputFileRef = useRef();
  
  // Lấy thông tin user từ session
  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      const session = raw ? JSON.parse(raw) : null;
      const activeEntity = session?.activeEntity || session?.account;
      if (activeEntity) {
        setUserInfo({
          name: activeEntity.name || activeEntity.userName || activeEntity.UserName || 'User',
          avatar: activeEntity.avatar || activeEntity.Avatar || "/default-avatar.png"
        });
      }
    } catch (e) {
      console.error('Error loading user info:', e);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
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
    
    // Lấy entityAccountId từ activeEntity trong session
    let session, entityAccountId, authorEntityId, authorEntityType;
    try {
      const raw = localStorage.getItem("session");
      session = raw ? JSON.parse(raw) : null;
    } catch (e) {
      session = null;
    }
    const activeEntity = session?.activeEntity || session?.account;
    entityAccountId = activeEntity?.EntityAccountId || activeEntity?.entityAccountId || activeEntity?.id || null;
    authorEntityId = activeEntity?.id || session?.account?.id || null;
    const rawRole = (activeEntity?.role || session?.account?.role || "").toLowerCase();
    if (rawRole === "bar" || rawRole === "barpage") {
      authorEntityType = "BarPage";
    } else if (rawRole === "dj" || rawRole === "dancer" || rawRole === "business") {
      authorEntityType = "BusinessAccount";
    } else {
      authorEntityType = "Account";
    }
    
    const formData = new FormData();
    formData.append("title", "Story");
    formData.append("content", caption || ""); // Đảm bảo luôn có giá trị (ít nhất là empty string)
    formData.append("caption", caption || ""); // Gửi cả caption để đảm bảo
    formData.append("expiredAt", new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,16));
    formData.append("images", croppedFile);
    formData.append("type", "story");
    if (entityAccountId) formData.append("entityAccountId", entityAccountId);
    if (authorEntityId) formData.append("authorEntityId", authorEntityId);
    if (authorEntityType) formData.append("authorEntityType", authorEntityType);
    // Story chỉ dùng songId (chọn từ danh sách), không upload file nhạc
    if (selectedSongId) {
      formData.append("songId", selectedSongId);
    }
    try {
      const res = await createStory(formData);
      if (res && res.data && res.data.data) {
        onStoryCreated(res.data.data);
      }
      setFile(null);
      setCaption("");
      setImageUrl("");
      setSelectedSongId("");
      if (onClose) onClose();
    } catch (err) {
      alert(t('modal.postFailed'));
    }
    setLoading(false);
  };

  // Render preview content
  const renderPreviewContent = () => {
    if (!imageUrl) {
      return (
        <div className="story-editor-preview-placeholder">
          {t('story.selectImage') || 'Chọn ảnh để bắt đầu'}
        </div>
      );
    }

  return (
      <div className="story-editor-cropper-container">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={9/16}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
        <div className="story-editor-cropper-controls">
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.01}
                  onChange={(_, value) => setZoom(value)}
            sx={{
              color: '#1877f2',
              '& .MuiSlider-thumb': {
                backgroundColor: '#1877f2',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#1877f2',
              }
            }}
                />
              </div>
        <button 
          className="story-editor-remove-btn"
          onClick={() => { 
            setFile(null); 
            setImageUrl(""); 
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="story-editor-modal" onClick={(e) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    }}>
      <div className="story-editor-container" onClick={(e) => e.stopPropagation()}>
        {/* Left Sidebar */}
        <div className="story-editor-sidebar">
          <div className="story-editor-header">
            <h2>{t('story.yourStory') || 'Your story'}</h2>
            <button className="story-editor-close-btn" onClick={onClose} title={t('action.close') || 'Close'}>
              ×
            </button>
          </div>
          
          {/* Profile Info */}
          <div className="story-editor-profile">
            <img 
              src={userInfo.avatar} 
              alt={userInfo.name}
              className="story-editor-profile-avatar"
            />
            <div className="story-editor-profile-name">{userInfo.name}</div>
          </div>
          
          {/* Options */}
          <div className="story-editor-options">
            {/* Add Text Option */}
            <button 
              className={`story-editor-option ${activePanel === 'text' ? 'active' : ''}`}
              onClick={() => {
                setActivePanel(activePanel === 'text' ? null : 'text');
              }}
            >
              <span className="story-editor-option-icon">Aa</span>
              <span>{t('story.addText') || 'Add text'}</span>
            </button>
            
            {/* Add Music Option */}
            <button 
              className={`story-editor-option ${activePanel === 'music' ? 'active' : ''}`}
              onClick={() => {
                setActivePanel(activePanel === 'music' ? null : 'music');
              }}
            >
              <span className="story-editor-option-icon">🎵</span>
              <span>{t('story.addMusic') || 'Add music'}</span>
            </button>
            
            {/* Alternative Text Option (optional) */}
            <button 
              className={`story-editor-option ${activePanel === 'alternative' ? 'active' : ''}`}
              onClick={() => {
                setActivePanel(activePanel === 'alternative' ? null : 'alternative');
              }}
              style={{ opacity: 0.6 }}
            >
              <span className="story-editor-option-icon">Aa</span>
              <span>{t('story.alternativeText') || 'Alternative text'}</span>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="story-editor-actions">
            <button 
              className="story-editor-btn story-editor-btn-discard"
              onClick={onClose}
            >
              {t('action.discard') || 'Discard'}
            </button>
            <button 
              className="story-editor-btn story-editor-btn-share"
              onClick={handleSubmit}
              disabled={loading || !file}
            >
              {loading ? (t('action.posting') || 'Posting...') : (t('story.shareToStory') || 'Share to story')}
            </button>
          </div>
        </div>
        
        {/* Right Preview Panel */}
        <div className="story-editor-preview">
          <div className="story-editor-preview-label">{t('story.preview') || 'Preview'}</div>
          <div className="story-editor-preview-area">
            <div className="story-editor-preview-content">
              {renderPreviewContent()}
            </div>
            </div>
          
          {/* Active Panel Content */}
          {activePanel === 'text' && (
            <div className="story-editor-text-panel">
              <label style={{ display: 'block', marginBottom: 8, color: '#e4e6eb', fontSize: 13, fontWeight: 600 }}>
                {t('input.caption') || 'Caption'}
              </label>
              <textarea
                className="story-editor-text-input"
                placeholder={t('input.captionStory') || 'Add a caption...'}
            value={caption}
            onChange={e => setCaption(e.target.value)}
                rows={4}
              />
            </div>
          )}
          
          {activePanel === 'music' && (
            <div className="story-editor-music-panel">
              {/* Story chỉ cho phép chọn nhạc từ danh sách, không upload file */}
              {!selectedSongId && (
                <SelectSong key={songListKey} value={selectedSongId} onChange={setSelectedSongId} />
              )}
              {selectedSongId && (
                <div style={{ marginTop: 12 }}>
                  <SelectSong key={songListKey} value={selectedSongId} onChange={setSelectedSongId} />
                  <button 
                    onClick={() => setSelectedSongId("")}
                    style={{
                      marginTop: 12,
                      padding: '8px 16px',
                      background: '#3a3b3c',
                      border: 'none',
                      borderRadius: 6,
                      color: '#e4e6eb',
                      cursor: 'pointer',
                      fontSize: 13,
                      width: '100%'
                    }}
                  >
                    {t('action.remove') || 'Remove'}
                  </button>
                </div>
              )}
          </div>
          )}
          
          {/* Image Upload Button (if no image) */}
          {!imageUrl && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={inputFileRef}
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => inputFileRef.current.click()}
                style={{
                  padding: '16px 32px',
                  background: '#1877f2',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t('story.selectImage') || 'Select Image'}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

