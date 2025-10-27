import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function StoryViewer({ stories, activeStory, onClose }) {
  const [current, setCurrent] = useState(
    stories.findIndex((s) => s.id === activeStory)
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (current < stories.length - 1) setCurrent(current + 1)
      else onClose()
    }, 6000) // 6s/story

    return () => clearTimeout(timer)
  }, [current])

  const story = stories[current]

  return (
    <AnimatePresence>
      <motion.div
        className="story-viewer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button className="close-btn" onClick={onClose}>
          <X size={28} />
        </button>

        <video
          src={story.video}
          autoPlay
          muted
          playsInline
          className="story-video"
        />

        <div className="story-overlay">
          <p className="story-username">{story.user}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
