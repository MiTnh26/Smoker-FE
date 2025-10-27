import { motion } from "framer-motion"
import "../../../styles/modules/story.css"

export default function StoryBar({ stories, onStoryClick }) {
  return (
    <div className="story-bar">
      <div className="story-scroll">
        {stories.map((story) => (
          <motion.div
            key={story.id}
            className="story-item"
            whileTap={{ scale: 0.95 }}
            onClick={() => onStoryClick(story.id)}
          >
            <img src={story.thumbnail} alt={story.user} className="story-thumbnail" />
            <p className="story-user">{story.user}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
