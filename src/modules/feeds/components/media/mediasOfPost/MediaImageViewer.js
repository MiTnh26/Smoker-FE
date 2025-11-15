import PropTypes from "prop-types";
import "../../../../../styles/modules/feeds/components/media/mediasOfPost/MediaImageViewer.css";

export default function MediaImageViewer({
  imageUrl,
  media,
  loading,
  error,
  imageError,
  onImageError
}) {
  if (loading) {
    return <div className="media-viewer-loading">Đang tải...</div>;
  }

  if (error && !media) {
    return <div className="media-viewer-error">{error}</div>;
  }

  if (imageError) {
    return <div className="media-viewer-error">Không thể tải ảnh</div>;
  }

  return (
    <img
      src={media?.url || imageUrl}
      alt={media?.caption || "Image"}
      className="media-viewer-image"
      onError={onImageError}
    />
  );
}

MediaImageViewer.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  media: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  imageError: PropTypes.bool.isRequired,
  onImageError: PropTypes.func.isRequired
};

