import { useTranslation } from "react-i18next";

export default function CreateStory({ onOpenEditor }) {
  const { t } = useTranslation();
  
  // Lấy thông tin user từ session
  let session;
  try {
    const raw = localStorage.getItem("session");
    session = raw ? JSON.parse(raw) : null;
  } catch (e) {
    session = null;
  }

  const user = session?.account || session?.activeEntity;
  const userAvatar = user?.avatar || user?.Avatar || '/default-avatar.png';
  const userName = user?.userName || user?.UserName || user?.name || user?.email || 'User';

  return (
    <button
      type="button"
      className="flex w-[112px] shrink-0 cursor-pointer flex-col items-center text-center"
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenEditor) {
          onOpenEditor();
        }
      }}
    >
      <div className="relative h-[200px] w-full overflow-hidden rounded-lg border-[0.5px] border-border/20 bg-muted shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-primary/40 bg-card p-[1px] shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-colors duration-200">
            <img
              src={userAvatar}
              alt={userName}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <p className="px-2 text-sm font-medium text-foreground">
            {t("story.createStoryButton")}
          </p>
        </div>
      </div>
    </button>
  );
}

