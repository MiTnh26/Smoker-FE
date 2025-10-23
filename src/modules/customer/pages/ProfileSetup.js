import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { userApi } from "../../../api/userApi";
import { useNavigate } from "react-router-dom";

const ProfileSetup = ({ onSave, redirectPath = "/customer/newsfeed" }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userName: '',
    avatar: '',
    background: '',
    bio: '',
    address: '',
    phone: '',
    gender: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Helpers
  const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
  const sanitizePhone = (value) => (value || '').replace(/\s/g, '').slice(0, 20);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await userApi.me();
        if (res && res.status === "success" && res.data) {
          const user = res.data;
          setForm({
            userName: user.userName || '',
            avatar: user.avatar || '',
            background: user.background || '',
            bio: user.bio || '',
            address: user.address || '',
            phone: user.phone || '',
            gender: user.gender || ''
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadProfile();
  }, []);

  // Validation functions
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    // Chuyển value sang string nếu có thể, dùng '' nếu là file hoặc null
    const val = typeof value === 'string' ? value.trim() : '';

    switch (name) {
      case 'userName':
        if (!val) newErrors.userName = 'Tên người dùng là bắt buộc';
        else if (val.length < 2) newErrors.userName = 'Tên phải có ít nhất 2 ký tự';
        else delete newErrors.userName;
        break;

      case 'avatar':
        // avatarFile được giữ riêng, val là URL preview nếu có
        if (!avatarFile && !val) newErrors.avatar = 'Ảnh đại diện là bắt buộc';
        else delete newErrors.avatar;
        break;

      case 'background':
        // Không bắt buộc
        delete newErrors.background;
        break;

      case 'phone':
        if (val && !isValidPhone(val)) newErrors.phone = 'Số điện thoại không hợp lệ';
        else delete newErrors.phone;
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const isValidPhone = (phone) => {
    const phoneRegex = /^[+]?0?[1-9]\d{0,15}$/;

    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? sanitizePhone(value) : value;
    // Limit bio length to 500 to match DB
    const limitedValue = name === 'bio' ? nextValue.slice(0, 500) : nextValue;
    setForm(prev => ({ ...prev, [name]: limitedValue }));

    // Validate field on change
    setTimeout(() => validateField(name, limitedValue), 300);
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files && files[0];

    if (name === 'avatar') {
      setAvatarFile(file || null);
      const previewUrl = file ? URL.createObjectURL(file) : form.avatar;
      setForm(prev => ({ ...prev, avatar: previewUrl }));

      // Validate với string URL
      validateField('avatar', previewUrl);
    }

    if (name === 'background') {
      setBackgroundFile(file || null);
      const previewUrl = file ? URL.createObjectURL(file) : form.background;
      setForm(prev => ({ ...prev, background: previewUrl }));

      validateField('background', previewUrl);
    }

  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    // Validate all fields
    const isFormValid = Object.keys(form).every(key => {
      if (key === 'userName' || key === 'avatar') {
        return validateField(key, form[key]);
      }
      return true;
    });

    if (!isFormValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Build FormData for multipart upload
      const formData = new FormData();
      formData.append('userName', form.userName.trim());
      formData.append('bio', (form.bio || '').slice(0, 500));
      formData.append('address', form.address || '');
      formData.append('phone', sanitizePhone(form.phone));
      formData.append('gender', form.gender || '');

      // if (avatarFile) {
      //   formData.append('avatar', avatarFile);
      // } else if (form.avatar && isHttpUrl(form.avatar)) {
      //   // Preserve existing URL but avoid sending blob: preview strings
      //   formData.append('avatar', form.avatar);
      // }

      // if (backgroundFile) {
      //   formData.append('background', backgroundFile);
      // } else if (form.background && isHttpUrl(form.background)) {
      //   formData.append('background', form.background);
      // }
      if (avatarFile) formData.append('avatar', avatarFile);
      if (backgroundFile) formData.append('background', backgroundFile);
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const result = await (onSave ? onSave(formData) : userApi.updateProfile(formData));

      if (result?.status === "success" || result?.token) {
        // Cập nhật localStorage
        const updatedUser = {
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          ...result.data, // hoặc result.user tùy response từ API
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setSuccess('Lưu hồ sơ thành công!');
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        throw new Error(result?.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      setErrors({ submit: error?.response?.data?.message || error.message || 'Cập nhật thất bại' });
    } finally {
      setIsLoading(false);
    }
  };


  const isFormValid = !errors.userName && !errors.avatar && !errors.background && !errors.phone &&
    form.userName.trim() && form.avatar.trim();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hoàn thiện hồ sơ
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Tạo hồ sơ cá nhân để kết nối với cộng đồng. Hãy chia sẻ một chút về bản thân!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Name */}
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên hiển thị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={form.userName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${errors.userName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="Nhập tên hiển thị của bạn"
                  aria-describedby={errors.userName ? 'userName-error' : undefined}
                  required
                />
                {errors.userName && (
                  <p id="userName-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.userName}
                  </p>
                )}
              </div>

              {/* Avatar */}
              <div>
                <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh đại diện <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  aria-describedby={errors.avatar ? 'avatar-error' : undefined}
                  required={!form.avatar}
                />
                {errors.avatar && (
                  <p id="avatar-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.avatar}
                  </p>
                )}
              </div>

              {/* Background */}
              <div>
                <label htmlFor="background" className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh nền
                </label>
                <input
                  type="file"
                  id="background"
                  name="background"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  aria-describedby={errors.background ? 'background-error' : undefined}
                />
                {errors.background && (
                  <p id="background-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.background}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Giới thiệu bản thân
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
                  placeholder="Chia sẻ một chút về bản thân, sở thích, hoặc điều gì đó đặc biệt..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  {form.bio.length}/500 ký tự
                </p>
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Nhập địa chỉ của bạn"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  placeholder="+84 123 456 789"
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>
              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Giới tính
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                >
                  <option value="">-- Chọn giới tính --</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              {/* Submit Error */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-600" role="alert">
                    {errors.submit}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <output className="text-sm text-green-600">
                    {success}
                  </output>
                </div>
              )}

              {/* Change Password Button */}
              <button
                type="button"
                onClick={() => navigate('/change-password')}
                className="w-full mb-4 py-3 px-6 rounded-xl font-medium border-2 border-teal-600 text-teal-600 hover:bg-teal-50 transition-all duration-200 flex items-center justify-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mr-2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Đổi mật khẩu
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 ${isFormValid && !isLoading
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                aria-describedby="submit-help"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang lưu...
                  </div>
                ) : (
                  'Hoàn thành hồ sơ'
                )}
              </button>

              <p id="submit-help" className="text-sm text-gray-500 text-center">
                Các trường có dấu <span className="text-red-500">*</span> là bắt buộc
              </p>
            </form>
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Xem trước hồ sơ</h3>

            {/* Profile Card Preview */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl p-6 space-y-4">
              {/* Background Image */}
              {form.background ? (
                <div className="relative h-32 rounded-lg overflow-hidden">
                  <img
                    src={form.background}
                    alt="Background preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-r from-teal-200 to-blue-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Ảnh nền</span>
                </div>
              )}

              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {form.avatar ? (
                    <img
                      src={form.avatar}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.userName || 'User')}&background=teal&color=fff&size=64`;
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold">
                      {form.userName ? form.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {form.userName || 'Tên người dùng'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {form.address || 'Địa chỉ'}
                  </p>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {form.userName || 'Tên người dùng'}
                </h4>
                <p className="text-sm text-gray-600">
                  {form.address || 'Địa chỉ'}
                </p>
                {form.gender && (
                  <p className="text-sm text-gray-600 capitalize">
                    {form.gender === 'male' ? 'Nam' : form.gender === 'female' ? 'Nữ' : 'Khác'}
                  </p>
                )}
              </div>
              {/* Bio */}
              {form.bio && (
                <div className="pt-2">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {form.bio}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="pt-2 space-y-1">
                {form.phone && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="mr-2">📞</span>
                    {form.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <h4 className="font-medium text-blue-900 mb-2">💡 Mẹo hay</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Sử dụng ảnh chất lượng cao cho avatar</li>
                <li>• Viết bio ngắn gọn, thú vị</li>
                <li>• Cập nhật thông tin liên hệ chính xác</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ProfileSetup.propTypes = {
  onSave: PropTypes.func,
  redirectPath: PropTypes.string,
};

export default ProfileSetup;


