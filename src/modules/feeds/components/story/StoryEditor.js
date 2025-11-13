import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import SelectSong from "../music/SelectSong";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import getCroppedImg from "../utils/cropImage";
import PropTypes from "prop-types";

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
    
    try {
      await onStoryCreated?.({
        file: croppedFile,
        caption,
        music: selectedSongId ? { musicId: selectedSongId } : undefined,
      });
      setFile(null);
      setCaption("");
      setImageUrl("");
      setSelectedSongId("");
      if (onClose) onClose();
    } catch (err) {
      console.error("[StoryEditor] Failed to create story:", err);
      alert(t('modal.postFailed'));
    }
    setLoading(false);
  };

  // Render preview content
  const renderPreviewContent = () => {
    if (!imageUrl) {
      return (
        <div className="flex h-[480px] w-full items-center justify-center rounded-lg border-[0.5px] border-border/20 bg-muted/40 text-sm text-muted-foreground">
          {t('story.selectImage') || 'Chọn ảnh để bắt đầu'}
        </div>
      );
    }

  return (
      <div className="relative h-[480px] w-full overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-black/60">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={9/16}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
        <div className="absolute bottom-2 left-2 right-2 z-10 rounded-lg bg-black/60 px-3 py-2 backdrop-blur">
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
          type="button"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white transition-colors hover:bg-black/80"
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
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60"
      tabIndex={-1}
      role="presentation"
      onClick={(e) => {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="grid w-[960px] max-w-[95vw] grid-cols-[280px_1fr] gap-4 rounded-lg border-[0.5px] border-border/20 bg-card p-4 text-card-foreground shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">{t('story.yourStory') || 'Your story'}</h2>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95"
              onClick={onClose}
              title={t('action.close') || 'Close'}
            >
              ×
            </button>
          </div>
          
          {/* Profile Info */}
          <div className="mb-4 flex items-center gap-3">
            <img 
              src={userInfo.avatar} 
              alt={userInfo.name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="text-sm font-medium">{userInfo.name}</div>
          </div>
          
          {/* Options */}
          <div className="space-y-2">
            {/* Add Text Option */}
            <button 
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${activePanel === 'text' ? 'bg-muted/60' : 'hover:bg-muted/50'}`}
              onClick={() => {
                setActivePanel(activePanel === 'text' ? null : 'text');
              }}
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">Aa</span>
              <span>{t('story.addText') || 'Add text'}</span>
            </button>
            
            {/* Add Music Option */}
            <button 
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${activePanel === 'music' ? 'bg-muted/60' : 'hover:bg-muted/50'}`}
              onClick={() => {
                setActivePanel(activePanel === 'music' ? null : 'music');
              }}
            >
              <span className="">🎵</span>
              <span>{t('story.addMusic') || 'Add music'}</span>
            </button>
            
            {/* Alternative Text Option (optional) */}
            <button 
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm opacity-60 transition-colors ${activePanel === 'alternative' ? 'bg-muted/60' : 'hover:bg-muted/50'}`}
              onClick={() => {
                setActivePanel(activePanel === 'alternative' ? null : 'alternative');
              }}
            >
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">Aa</span>
              <span>{t('story.alternativeText') || 'Alternative text'}</span>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="mt-auto flex items-center gap-2">
            <button 
              className="bg-transparent border-none px-4 py-2 font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95 rounded-lg"
              onClick={onClose}
            >
              {t('action.discard') || 'Discard'}
            </button>
            <button 
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={loading || !file}
            >
              {loading ? (t('action.posting') || 'Posting...') : (t('story.shareToStory') || 'Share to story')}
            </button>
          </div>
        </div>
        
        {/* Right Preview Panel */}
        <div className="flex flex-col">
          <div className="mb-2 text-sm font-medium text-muted-foreground">{t('story.preview') || 'Preview'}</div>
          <div className="rounded-lg border-[0.5px] border-border/20 bg-card p-3">
            <div className="flex items-center justify-center">
              {renderPreviewContent()}
            </div>
            </div>
          
          {/* Active Panel Content */}
          {activePanel === 'text' && (
            <div className="mt-4">
              <label className="mb-2 block text-[13px] font-semibold text-foreground/80">
                {t('input.caption') || 'Caption'}
              </label>
              <textarea
                className="w-full rounded-lg border-[0.5px] border-border/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
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
                <SelectSong value={selectedSongId} onChange={setSelectedSongId} />
              )}
              {selectedSongId && (
                <div style={{ marginTop: 12 }}>
                  <SelectSong value={selectedSongId} onChange={setSelectedSongId} />
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
            <div className="mt-5 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={inputFileRef}
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => inputFileRef.current.click()}
                className="rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
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

StoryEditor.propTypes = {
  onStoryCreated: PropTypes.func,
  onClose: PropTypes.func,
};

