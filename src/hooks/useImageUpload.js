import { useState } from "react";
import axiosClient from "../api/axiosClient";

/**
 * Hook for image upload functionality
 * Tracks upload state per field (avatar, background separately)
 * @param {Object} options - Upload configuration
 * @param {string} options.endpoint - Upload endpoint (default: '/posts/upload')
 * @param {number} options.maxSize - Max file size in bytes (default: 5MB)
 * @param {Function} options.onSuccess - Callback when upload succeeds
 * @returns {Object} { upload, uploading, error }
 */
export const useImageUpload = ({ 
  endpoint = '/posts/upload', 
  maxSize = 5 * 1024 * 1024, // 5MB default
  onSuccess 
} = {}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const upload = async (file) => {
    // Validation
    if (!file.type.startsWith('image/')) {
      const err = new Error('File must be an image');
      setError(err);
      throw err;
    }
    
    if (file.size > maxSize) {
      const err = new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      setError(err);
      throw err;
    }

    // Upload logic
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('images', file);
      
      const response = await axiosClient.post(endpoint, formData);
      
      const uploadedFile = response.data?.[0] || response.data;
      const url = uploadedFile?.url || uploadedFile;
      
      if (!url) {
        const err = new Error('Upload failed - no URL in response');
        setError(err);
        throw err;
      }
      
      if (onSuccess) {
        onSuccess(url);
      }
      
      return url;
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err.message || 'Upload failed';
      setError(err);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
};

