import { useState } from "react"
import { useTranslation } from "react-i18next"

export default function CreateStory({ onStoryCreated }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null)

  const handleUpload = (e) => {
    setFile(e.target.files[0])
  }

  const handleSubmit = () => {
    if (!file) return
    // tạo story mới
    const newStory = {
      id: Date.now(),
      user: "Bạn",
      avatar: "https://i.pravatar.cc/40?img=10",
      thumbnail: URL.createObjectURL(file),
      video: file.type.startsWith("video") ? URL.createObjectURL(file) : null,
      type: file.type.startsWith("video") ? "video" : "image",
      time: "Vừa xong",
      views: 0,
      liked: false,
      caption: ""
    }
    onStoryCreated(newStory)
    setFile(null)
  }

  return (
    <div className="relative flex h-[220px] w-[140px] flex-shrink-0 cursor-pointer flex-col items-center overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <label className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg bg-card px-4 text-center text-lg font-semibold text-foreground transition-colors duration-200 hover:bg-muted/70">
        {t('story.createStoryButton')}
        <input type="file" accept="image/*,video/*" onChange={handleUpload} hidden />
      </label>
      {file && (
        <button
          className="absolute bottom-3 w-[calc(100%-24px)] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          onClick={handleSubmit}
        >
          {t('action.post')}
        </button>
      )}
    </div>
  )
}

