import "../../../styles/modules/feeds/CreateStory.css"
import { useState } from "react"

export default function CreateStory({ onStoryCreated }) {
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
    <div className="create-story">
      <label className="story-upload-btn">
        + Tạo Story
        <input type="file" accept="image/*,video/*" onChange={handleUpload} hidden />
      </label>
      {file && <button onClick={handleSubmit}>Đăng</button>}
    </div>
  )
}
