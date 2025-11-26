import PropTypes from "prop-types";

export default function MediaImageViewer({
  imageUrl,
  media,
  loading,
  error,
  imageError,
  onImageError
}) {
  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải...</div>;
  }

  if (error && !media) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (imageError) {
    return <div className="p-8 text-center text-destructive">Không thể tải ảnh</div>;
  }

  return (
    <img
      src={media?.url || imageUrl}
      alt={media?.caption || "Image"}
      className="max-w-full max-h-[90vh] object-contain w-full h-auto"
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

