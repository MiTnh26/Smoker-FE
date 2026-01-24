import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { userApi } from "../../../api/userApi";
import { formatAddressForSave, validateAddressFields } from "../../../utils/addressFormatter";
import { locationApi } from "../../../api/locationApi";
import { useNavigate } from "react-router-dom";
import { Info, X } from "lucide-react";
import { Button } from "../../../components/common/Button";
import "../../../styles/modules/profileSetup.css";

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

  // Location states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [showHint, setShowHint] = useState(true); // State để ẩn/hiện hint
  const isLoadingProfileRef = useRef(false); // Ref để track đang load profile (không trigger re-render)
  const hasLoadedFromProfileRef = useRef(false); // Ref để track đã load từ profile (không reset giá trị)

  // Helpers
  const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);
  const sanitizePhone = (value) => (value || '').replace(/\s/g, '').slice(0, 20);

  // Load provinces on mount
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        setLocationLoading(true);
        const data = await locationApi.getProvinces();
        setProvinces(data);
      } catch (error) {
        console.error('Failed to load provinces:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadProvinces();
  }, []);

  // Load districts when province is selected
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvinceId) {
        setDistricts([]);
        // Chỉ reset nếu đã initialized và không phải đang load từ profile
        if (isInitialized && !hasLoadedFromProfileRef.current) {
          setSelectedDistrictId('');
        }
        return;
      }

      // Nếu đang load profile, không load lại districts vì đã load sẵn
      if (isLoadingProfileRef.current) {
        return;
      }

      try {
        setLocationLoading(true);
        const data = await locationApi.getDistricts(selectedProvinceId);
        setDistricts(data);
        // Chỉ reset district and ward selection nếu đã initialized và không phải đang load từ profile
        if (isInitialized && !hasLoadedFromProfileRef.current) {
          setSelectedDistrictId('');
          setSelectedWardId('');
          setWards([]);
        }
      } catch (error) {
        console.error('Failed to load districts:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadDistricts();
  }, [selectedProvinceId, isInitialized]);

  // Load wards when district is selected
  useEffect(() => {
    const loadWards = async () => {
      if (!selectedDistrictId) {
        setWards([]);
        // Chỉ reset selectedWardId nếu đã initialized và không phải đang load từ profile
        if (isInitialized && !hasLoadedFromProfileRef.current) {
          setSelectedWardId('');
        }
        return;
      }

      // Nếu đang load profile, không load lại wards vì đã load sẵn
      if (isLoadingProfileRef.current) {
        return;
      }

      try {
        setLocationLoading(true);
        const data = await locationApi.getWards(selectedDistrictId);
        setWards(data);
        // Chỉ reset selectedWardId nếu đã initialized và không phải đang load từ profile
        if (isInitialized && !hasLoadedFromProfileRef.current) {
          setSelectedWardId('');
        }
      } catch (error) {
        console.error('Failed to load wards:', error);
      } finally {
        setLocationLoading(false);
      }
    };
    loadWards();
  }, [selectedDistrictId, isInitialized]);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      isLoadingProfileRef.current = true; // Bắt đầu load profile
      try {
        const res = await userApi.me();
        if (res && res.status === "success" && res.data) {
          const user = res.data;

          // Xử lý address trước - chỉ lấy detail, không lấy toàn bộ JSON
          // Ưu tiên lấy detail từ addressData (backend đã thêm trường này)
          let addressDetail = '';
          let parsedAddressData = null;

          // Ưu tiên 1: Lấy detail từ addressData (backend đã parse sẵn)
          if (user.addressData && user.addressData.detail) {
            addressDetail = user.addressData.detail;
            parsedAddressData = user.addressData; // Dùng addressData cho location
          } else if (user.address) {
            // Fallback: Parse address JSON string nếu addressData không có detail
            try {
              const parsed = JSON.parse(user.address);
              if (parsed && parsed.detail) {
                addressDetail = parsed.detail;
                parsedAddressData = parsed; // Lưu lại để dùng cho location nếu không có addressData
              } else if (typeof user.address === 'string' && !user.address.trim().startsWith('{')) {
                // Nếu không phải JSON và là string thông thường, dùng luôn
                addressDetail = user.address;
              }
            } catch {
              // Nếu không parse được JSON, có thể là string thông thường
              if (typeof user.address === 'string' && !user.address.trim().startsWith('{')) {
                addressDetail = user.address;
              }
            }
          }

          setForm({
            userName: user.userName || '',
            avatar: user.avatar || '',
            background: user.background || '',
            bio: user.bio || '',
            address: addressDetail,
            phone: user.phone || '',
            gender: user.gender || ''
          });

          // Load structured address data if available
          // Ưu tiên dùng addressData (backend đã parse sẵn), nếu không có thì dùng parsedAddressData từ address JSON
          const locationData = user.addressData || parsedAddressData;

          if (locationData && locationData.provinceId) {
            // Load tất cả dữ liệu trước khi set state để tránh useEffect reset
            try {
              const districtsData = await locationApi.getDistricts(locationData.provinceId);
              let wardsData = [];

              if (locationData.districtId) {
                wardsData = await locationApi.getWards(locationData.districtId);
              }

              // Set tất cả state cùng lúc sau khi đã load xong tất cả dữ liệu
              // Đảm bảo isLoadingProfileRef vẫn là true khi set để useEffect không load lại
              setDistricts(districtsData);
              setWards(wardsData);

              // Đánh dấu đã load từ profile để không reset giá trị
              hasLoadedFromProfileRef.current = true;

              // Set tất cả location state cùng lúc
              // Các useEffect sẽ check isLoadingProfileRef và return early nếu đang load profile
              setSelectedProvinceId(locationData.provinceId);

              if (locationData.districtId) {
                setSelectedDistrictId(locationData.districtId);
                if (locationData.wardId) {
                  setSelectedWardId(locationData.wardId);
                }
              }
            } catch (error) {
              console.error('Failed to load location data:', error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        // Set initialized TRƯỚC khi tắt flag để đảm bảo các useEffect không reset giá trị
        // Khi isInitialized = true, các useEffect sẽ không reset nếu giá trị đã được set từ profile
        setIsInitialized(true);
        // Đợi một chút để đảm bảo isInitialized đã được set
        await new Promise(resolve => setTimeout(resolve, 50));
        // Sau đó mới tắt flag để các useEffect có thể chạy bình thường
        isLoadingProfileRef.current = false;
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
        else if (val.length < 4) newErrors.userName = 'Tên người dùng phải có ít nhất 4 ký tự';
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

    // Clear errors when user starts typing in the field
    if (errors[name] || errors.submit) {
      setErrors(prev => {
        const newErrors = { ...prev };
        // Clear field-specific error
        if (newErrors[name]) {
          delete newErrors[name];
        }
        // Clear submit error when user starts typing any field
        if (newErrors.submit) {
          delete newErrors.submit;
        }
        return newErrors;
      });
    }

    // Validate field immediately for phone to fix the issue
    if (name === 'phone') {
      validateField(name, limitedValue);
    } else {
      // Validate other fields on change with delay
      setTimeout(() => validateField(name, limitedValue), 300);
    }
  };

  const handleLocationChange = (type, value) => {
    if (type === 'province') {
      setSelectedProvinceId(value);
    } else if (type === 'district') {
      setSelectedDistrictId(value);
    } else if (type === 'ward') {
      setSelectedWardId(value);
    }
  };

  // Build full address string from selected location
  const buildAddress = () => {
    const parts = [];
    const addressDetail = form.address?.trim() || '';
    if (addressDetail) parts.push(addressDetail);

    const selectedWard = wards.find(w => w.id === selectedWardId);
    const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
    const selectedProvince = provinces.find(p => p.id === selectedProvinceId);

    if (selectedWard) parts.push(selectedWard.name);
    if (selectedDistrict) parts.push(selectedDistrict.name);
    if (selectedProvince) parts.push(selectedProvince.name);

    return parts.join(', ');
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files && files[0];

    // Clear errors when user selects a new file
    if (errors[name] || errors.submit) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[name]) {
          delete newErrors[name];
        }
        if (newErrors.submit) {
          delete newErrors.submit;
        }
        return newErrors;
      });
    }

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

    // Basic validation: check required fields are filled
    if (!form.userName.trim() || form.userName.trim().length < 4) {
      setErrors(prev => ({ ...prev, userName: 'Tên người dùng phải có ít nhất 4 ký tự' }));
      return;
    }

    if (!form.avatar.trim() && !avatarFile) {
      setErrors(prev => ({ ...prev, avatar: 'Ảnh đại diện là bắt buộc' }));
      return;
    }

    // Validate phone if provided (but don't block submit - let backend validate)
    if (form.phone && !validateField('phone', form.phone)) {
      // Show warning but allow submit to see backend validation
      console.warn('Phone validation failed, but allowing submit to see backend error');
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('userName', form.userName.trim());
      formData.append('bio', (form.bio || '').slice(0, 500));

      const detail = (form.address || '').trim();

      // Kiểm tra nếu người dùng đã chọn đầy đủ các cấp hành chính
      if (selectedProvinceId && selectedDistrictId && selectedWardId) {
        // TẠO ĐỐI TƯỢNG ĐÚNG CẤU TRÚC BẠN YÊU CẦU
        const addressObj = {
          detail: detail, // Chỉ lưu text thuần vào đây
          provinceId: selectedProvinceId,
          districtId: selectedDistrictId,
          wardId: selectedWardId
        };
        formData.append('address', JSON.stringify(addressObj));
      } else if (detail) {
        // Nếu chỉ nhập text thuần mà không chọn dropdown
        formData.append('address', detail);
      }
      // If no address info at all, don't append anything

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
        // Get updated user data from API
        let updatedUserData = result.data || result.user;
        if (!updatedUserData) {
          // If not in result, fetch from API
          try {
            const userRes = await userApi.me();
            if (userRes?.status === "success" && userRes.data) {
              updatedUserData = userRes.data;
            }
          } catch (fetchError) {
            console.error('Failed to fetch updated user data:', fetchError);
          }
        }

        // Cập nhật localStorage user
        if (updatedUserData) {
          const updatedUser = {
            ...JSON.parse(localStorage.getItem("user") || "{}"),
            ...updatedUserData,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        // IMPORTANT: Update session in localStorage so menu and sidebar show new avatar
        try {
          const { getSession, updateSession } = await import("../../../utils/sessionManager");
          const session = getSession();

          if (session && updatedUserData) {
            console.log(`[PROFILE SETUP] Current session:`, session);

            // Preserve EntityAccountId when updating account
            const accountEntityAccountId = session.account?.EntityAccountId || session.account?.entityAccountId || null;

            // Update account (preserve EntityAccountId)
            const updatedAccount = {
              ...session.account,
              avatar: updatedUserData.avatar || session.account.avatar,
              userName: updatedUserData.userName || session.account.userName,
              phone: updatedUserData.phone || session.account.phone,
              bio: updatedUserData.bio || session.account.bio,
              address: updatedUserData.address || session.account.address,
              EntityAccountId: accountEntityAccountId, // Preserve EntityAccountId
            };

            // Update activeEntity if exists (preserve EntityAccountId)
            const updatedActiveEntity = session.activeEntity ? {
              ...session.activeEntity,
              avatar: updatedUserData.avatar || session.activeEntity.avatar,
              name: updatedUserData.userName || session.activeEntity.name,
              EntityAccountId: session.activeEntity.EntityAccountId || session.activeEntity.entityAccountId || null, // Preserve EntityAccountId
            } : null;

            // Update entities array if exists
            const updatedEntities = session.entities && Array.isArray(session.entities)
              ? session.entities.map(entity => {
                if (entity.type === "Account" && entity.id === session.account?.id) {
                  return {
                    ...entity,
                    avatar: updatedUserData.avatar || entity.avatar,
                    name: updatedUserData.userName || entity.name,
                    EntityAccountId: entity.EntityAccountId || entity.entityAccountId || null, // Preserve EntityAccountId
                  };
                }
                return entity;
              })
              : session.entities;

            // Update session using sessionManager
            updateSession({
              account: updatedAccount,
              activeEntity: updatedActiveEntity || session.activeEntity,
              entities: updatedEntities,
            });

            console.log(`[PROFILE SETUP] Session updated via sessionManager`);

            // Dispatch custom event to notify other components (menu, sidebar, etc.)
            const event = new Event('profileUpdated');
            window.dispatchEvent(event);
            console.log(`[PROFILE SETUP] Dispatched profileUpdated event`);

            const customEvent = new CustomEvent('profileUpdated', {
              detail: { avatar: updatedUserData.avatar, userName: updatedUserData.userName }
            });
            window.dispatchEvent(customEvent);
            console.log(`[PROFILE SETUP] Dispatched customEvent with detail`);
          }
        } catch (sessionError) {
          console.error(`[PROFILE SETUP] Error updating session:`, sessionError);
        }

        setSuccess('Lưu hồ sơ thành công!');
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        throw new Error(result?.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Cập nhật thất bại';

      // If error is about userName validation, set it to userName field
      if (errorMessage.includes('Tên người dùng') || errorMessage.includes('userName')) {
        setErrors(prev => ({
          ...prev,
          userName: errorMessage,
          submit: errorMessage
        }));
      }
      // If error is about phone validation, set it to phone field
      else if (errorMessage.includes('điện thoại') || errorMessage.includes('phone')) {
        setErrors(prev => ({
          ...prev,
          phone: errorMessage,
          submit: errorMessage
        }));
      }
      // If error is about gender validation, set it to gender field
      else if (errorMessage.includes('Giới tính') || errorMessage.includes('gender')) {
        setErrors(prev => ({
          ...prev,
          gender: errorMessage,
          submit: errorMessage
        }));
      }
      else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };


  // Form is valid if required fields are filled (userName, avatar)
  // Don't block submit due to validation errors - let user submit and see backend errors
  const isFormValid = form.userName.trim().length >= 4 && form.avatar.trim();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="profile-setup min-h-screen py-4 px-3 sm:px-5 lg:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="ps-title text-3xl font-bold mb-1">
            Hoàn thiện hồ sơ
          </h1>
          <p className="ps-muted max-w-2xl mx-auto">
            Tạo hồ sơ cá nhân để kết nối với cộng đồng. Hãy chia sẻ một chút về bản thân!
          </p>
        </div>

        {/* Friendly Hint */}
        {(() => {
          const hasPhone = form.phone.trim() !== '';
          const hasFullAddress = selectedProvinceId && selectedDistrictId && selectedWardId && form.address.trim() !== '';
          const needsInfo = !hasPhone && !hasFullAddress;
          return needsInfo && showHint;
        })() && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center flex-1 gap-2">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Để hoàn tất hồ sơ, bạn cần điền <strong>địa chỉ</strong> hoặc <strong>số điện thoại</strong>. Bạn có thể bỏ qua bây giờ và điền sau.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="flex-shrink-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded p-1 transition-colors"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="ps-card rounded-2xl p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Name */}
              <div>
                <label htmlFor="userName" className="ps-label block text-sm font-medium mb-2">
                  Tên hiển thị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="userName"
                  name="userName"
                  value={form.userName}
                  onChange={handleInputChange}
                  className={`ps-input w-full px-4 py-3 rounded-xl ${errors.userName ? 'ps-input-error' : ''}`}
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
                <label htmlFor="avatar" className="ps-label block text-sm font-medium mb-2">
                  Ảnh đại diện <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-transparent"
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
                <label htmlFor="background" className="ps-label block text-sm font-medium mb-2">
                  Ảnh nền
                </label>
                <input
                  type="file"
                  id="background"
                  name="background"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-transparent"
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
                <label htmlFor="bio" className="ps-label block text-sm font-medium mb-2">
                  Giới thiệu bản thân
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={form.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="ps-input w-full px-4 py-3 rounded-xl resize-none"
                  placeholder="Chia sẻ một chút về bản thân, sở thích, hoặc điều gì đó đặc biệt..."
                />
                <p className="mt-2 text-sm ps-hint">
                  {form.bio.length}/500 ký tự
                </p>
              </div>

              {/* Address - Province */}
              <div>
                <label htmlFor="province" className="ps-label block text-sm font-medium mb-2">
                  Tỉnh/Thành phố
                </label>
                <select
                  id="province"
                  name="province"
                  value={selectedProvinceId}
                  onChange={(e) => handleLocationChange('province', e.target.value)}
                  disabled={locationLoading}
                  className="ps-input w-full px-4 py-3 rounded-xl disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn Tỉnh/Thành phố --</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name} ({province.typeText})
                    </option>
                  ))}
                </select>
              </div>

              {/* Address - District */}
              {selectedProvinceId && (
                <div>
                  <label htmlFor="district" className="ps-label block text-sm font-medium mb-2">
                    Quận/Huyện
                  </label>
                  <select
                    id="district"
                    name="district"
                    value={selectedDistrictId}
                    onChange={(e) => handleLocationChange('district', e.target.value)}
                    disabled={locationLoading || !selectedProvinceId}
                    className="ps-input w-full px-4 py-3 rounded-xl disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name} ({district.typeText})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Address - Ward */}
              {selectedDistrictId && (
                <div>
                  <label htmlFor="ward" className="ps-label block text-sm font-medium mb-2">
                    Phường/Xã
                  </label>
                  <select
                    id="ward"
                    name="ward"
                    value={selectedWardId}
                    onChange={(e) => handleLocationChange('ward', e.target.value)}
                    disabled={locationLoading || !selectedDistrictId}
                    className="ps-input w-full px-4 py-3 rounded-xl disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn Phường/Xã --</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name} ({ward.typeText})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Additional Address Detail */}
              {(selectedProvinceId || selectedDistrictId || selectedWardId) && (
                <div>
                  <label htmlFor="address" className="ps-label block text-sm font-medium mb-2">
                    Địa chỉ chi tiết (số nhà, tên đường...)
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    className="ps-input w-full px-4 py-3 rounded-xl"
                    placeholder="Số nhà, tên đường, tổ, khu phố..."
                  />
                  <p className="mt-1 text-xs ps-hint">
                    Địa chỉ đầy đủ: {buildAddress() || 'Chưa chọn'}
                  </p>
                </div>
              )}

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="ps-label block text-sm font-medium mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  className={`ps-input w-full px-4 py-3 rounded-xl ${errors.phone ? 'ps-input-error' : ''}`}
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
                <label className="ps-label block text-sm font-medium mb-2">
                  Giới tính
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={form.gender === 'male'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-foreground">Nam</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={form.gender === 'female'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-foreground">Nữ</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="other"
                      checked={form.gender === 'other'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-foreground">Khác</span>
                  </label>
                </div>
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
              {/* <button
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
              </button> */}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(redirectPath, { replace: true })}
                  disabled={isLoading}
                  className="flex-1 py-3 px-5 rounded-xl font-medium border-2 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className={`ps-btn-primary flex-1 py-3 px-5 rounded-xl font-medium ${(isLoading || !isFormValid) ? 'ps-btn-disabled opacity-50 cursor-not-allowed' : ''}`}
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
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="ps-card ps-preview rounded-2xl p-5 sm:p-6">
            <h3 className="ps-title text-lg font-semibold mb-4">Xem trước hồ sơ</h3>

            {/* Profile Card Preview */}
            <div className="ps-preview-body rounded-xl p-5 space-y-4">
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
                <div className="relative h-32 rounded-lg overflow-hidden">
                  <img
                    src="/13.png"
                    alt="Default background"
                    className="w-full h-full object-cover"
                  />
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
                  <h4 className="ps-title font-semibold">
                    {form.userName || 'Tên người dùng'}
                  </h4>
                  <p className="text-sm ps-muted">
                    {buildAddress() || form.address || 'Địa chỉ'}
                  </p>
                  {form.gender && (
                    <p className="text-sm ps-muted capitalize">
                      {form.gender === 'male' ? 'Nam' : form.gender === 'female' ? 'Nữ' : 'Khác'}
                    </p>
                  )}
                </div>
              </div>
              {/* Bio */}
              {form.bio && (
                <div className="pt-2">
                  <p className="text-sm ps-body leading-relaxed">
                    {form.bio}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="pt-2 space-y-1">
                {form.phone && (
                  <p className="text-sm ps-muted flex items-center">
                    <span className="mr-2">📞</span>
                    {form.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-4 ps-subtle rounded-xl">
              <h4 className="ps-title font-medium mb-2">💡 Mẹo hay</h4>
              <ul className="text-sm ps-muted space-y-1">
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


