import "../../../styles/modules/feeds/CreatePostBox.css"

export default function CreatePostBox({ onCreate }) {
  return (
    <div className="create-post-box">
      <div className="create-post-top">
        <img
          src="https://media.techz.vn/resize_x700x/media2019/source/01TRAMY/2024MY1/mckanhnong.png"
          alt="User avatar"
          className="create-avatar"
        />
        <input
          type="text"
          placeholder="Bạn muốn đăng gì hôm nay?"
          className="create-input"
          onFocus={() => onCreate?.()}
        />
      </div>

      <div className="create-post-actions">
        <button className="action-btn">
          <i className="fa-solid fa-image"></i> Ảnh/Video
        </button>
        <button className="action-btn">
          <i className="fa-solid fa-music"></i> Âm nhạc
        </button>
        <button className="action-btn">
          <i className="fa-solid fa-face-smile"></i> Cảm xúc
        </button>
      </div>
    </div>
  )
}
