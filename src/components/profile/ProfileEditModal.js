import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { userApi } from '../../api/userApi';
import barPageApi from '../../api/barPageApi';
import businessApi from '../../api/businessApi';
import { ImageUploadField } from './ImageUploadField';
import AddressSelector from '../common/AddressSelector';
import { X } from 'lucide-react';

export default function ProfileEditModal({ profile, profileType, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Address selector states
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');

  useEffect(() => {
    if (profile) {
      // For BarPage, use BarName; for others, use userName
      const nameField = profileType === 'BarPage' 
        ? (profile.BarName || profile.barName || profile.userName || profile.name || '')
        : (profile.userName || profile.name || '');
      
      setFormData({
        userName: nameField,
        BarName: profileType === 'BarPage' ? nameField : undefined,
        bio: profile.bio || profile.Bio || '',
        phone: profile.phone || profile.Phone || '',
        address: profile.address || profile.Address || '',
        pricePerHours: profile.pricePerHours || profile.PricePerHours || '',
        pricePerSession: profile.pricePerSession || profile.PricePerSession || '',
        avatar: profile.avatar || profile.Avatar || '',
        background: profile.background || profile.Background || '',
      });

      // Parse address data to populate AddressSelector
      // Backend returns: provinceId, districtId, wardId, addressDetail, addressObject
      if (profile.provinceId || profile.districtId || profile.wardId || profile.addressDetail) {
        setSelectedProvinceId(profile.provinceId || '');
        setSelectedDistrictId(profile.districtId || '');
        setSelectedWardId(profile.wardId || '');
        setAddressDetail(profile.addressDetail || '');
      } else if (profile.addressObject && typeof profile.addressObject === 'object') {
        // Fallback: parse from addressObject
        const addrObj = profile.addressObject;
        setSelectedProvinceId(addrObj.provinceId || '');
        setSelectedDistrictId(addrObj.districtId || '');
        setSelectedWardId(addrObj.wardId || '');
        setAddressDetail(addrObj.detail || addrObj.addressDetail || '');
      }
    }
  }, [profile, profileType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.userName?.trim()) {
      newErrors.userName = t('profile.nameRequired') || 'Name is required';
    }
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      let res;
      const data = { ...formData };
      
      // Build address object with IDs if any address component is selected
      if (selectedProvinceId || selectedDistrictId || selectedWardId || addressDetail) {
        const addressObj = {};
        if (addressDetail) addressObj.detail = addressDetail;
        if (selectedProvinceId) addressObj.provinceId = selectedProvinceId;
        if (selectedDistrictId) addressObj.districtId = selectedDistrictId;
        if (selectedWardId) addressObj.wardId = selectedWardId;
        // Store as JSON string for backend
        data.address = JSON.stringify(addressObj);
      }
      
      // Remove empty fields
      for (const key of Object.keys(data)) {
        if (data[key] === '' || data[key] === null || data[key] === undefined) {
          delete data[key];
        }
      }
      
      // Remove bio for BarPage since table doesn't have Bio column
      if (profileType === 'BarPage' && data.bio !== undefined) {
        delete data.bio;
      }

      switch (profileType) {
        case 'Account':
          res = await userApi.updateProfile(data);
          break;
        case 'BarPage': {
          // Use EntityAccountId for bar page update (not id)
          const barEntityAccountId = profile.EntityAccountId || profile.entityAccountId;
          if (!barEntityAccountId) {
            console.error("EntityAccountId is missing from profile object in ProfileEditModal", profile);
            setErrors({ submit: "Internal Error: Bar EntityAccountId is missing. Cannot save." });
            setSaving(false);
            return;
          }
          const barData = { ...data };
          // Map userName to BarName for BarPage API
          if (barData.userName && !barData.BarName) {
            barData.BarName = barData.userName;
          }
          res = await barPageApi.updateBarPage(barEntityAccountId, barData);
          break;
        }
        case 'BusinessAccount': {
          // Use EntityAccountId for business account update (not id)
          const businessEntityAccountId = profile.EntityAccountId || profile.entityAccountId;
          if (!businessEntityAccountId) {
            console.error("EntityAccountId is missing from profile object in ProfileEditModal", profile);
            setErrors({ submit: "Internal Error: Business EntityAccountId is missing. Cannot save." });
            setSaving(false);
            return;
          }
          res = await businessApi.updateBusiness(businessEntityAccountId, data);
          break;
        }
        default:
          throw new Error('Invalid profile type');
      }

      if (res?.status === 'success') {
        onSuccess();
        onClose();
      } else {
        setErrors({ submit: res?.message || t('profile.updateFailed') || 'Update failed' });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || error.message || t('profile.updateFailed') || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    const isPerformer = profileType === 'BusinessAccount';

      return (
      <div className={cn('space-y-5')}>
        {/* Avatar & Background */}
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6')}>
          <div className={cn('space-y-3')}>
            <label className={cn('block text-sm font-semibold text-foreground mb-2')}>
              {t('profile.avatar') || 'Avatar'}
            </label>
            <ImageUploadField 
              label="" 
              value={formData.avatar} 
              onChange={url => setFormData(p => ({...p, avatar: url}))} 
              uploading={uploadingAvatar} 
              onUploadStateChange={setUploadingAvatar}
              urlInput={false}
            />
          </div>
          <div className={cn('space-y-3')}>
            <label className={cn('block text-sm font-semibold text-foreground mb-2')}>
              {t('profile.background') || 'Background'}
            </label>
            <ImageUploadField
              label="" 
              value={formData.background} 
              onChange={url => setFormData(p => ({...p, background: url}))} 
              uploading={uploadingBackground} 
              onUploadStateChange={setUploadingBackground}
              urlInput={false}
            />
          </div>
        </div>

        {/* Name */}
        <div className={cn('space-y-2')}>
          <label htmlFor="userName" className={cn('block text-sm font-semibold text-foreground')}>
            {t('profile.name') || 'Name'} <span className={cn('text-danger')}>*</span>
          </label>
          <input
            id="userName"
            name="userName"
            type="text"
            value={formData.userName || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-3 rounded-xl border',
              'bg-background/50 backdrop-blur-sm text-foreground',
              'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200 placeholder:text-muted-foreground/50',
              errors.userName && 'border-danger focus:border-danger focus:ring-danger/20'
            )}
            placeholder={t('profile.namePlaceholder') || 'Enter your name'}
          />
          {errors.userName && (
            <p className={cn('text-sm text-danger flex items-center gap-1')}>
              <span>⚠</span> {errors.userName}
            </p>
          )}
        </div>

        {/* Bio - Only for Account and BusinessAccount, not for BarPage */}
        {profileType !== 'BarPage' && (
          <div className={cn('space-y-2')}>
            <label htmlFor="bio" className={cn('block text-sm font-semibold text-foreground')}>
              {t('profile.bio') || 'Giới thiệu'}
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={formData.bio || ''}
              onChange={handleChange}
              className={cn(
                'w-full px-4 py-3 rounded-xl border resize-none',
                'bg-background/50 backdrop-blur-sm text-foreground',
                'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
                'transition-all duration-200 placeholder:text-muted-foreground/50'
              )}
              placeholder={t('profile.bioPlaceholder') || 'Tell us about yourself...'}
            />
          </div>
        )}

        {/* Phone */}
        <div className={cn('space-y-2')}>
          <label htmlFor="phone" className={cn('block text-sm font-semibold text-foreground')}>
            {t('profile.phone') || 'Điện thoại'}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-3 rounded-xl border',
              'bg-background/50 backdrop-blur-sm text-foreground',
              'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200 placeholder:text-muted-foreground/50'
            )}
            placeholder={t('profile.phonePlaceholder') || 'Enter your phone number'}
          />
        </div>

        {/* Address - AddressSelector with dropdowns */}
        <div className={cn('space-y-2')}>
          <label className={cn('block text-sm font-semibold text-foreground')}>
            {t('profile.address') || 'Địa chỉ'}
          </label>
          <div className={cn('bg-background/30 backdrop-blur-sm rounded-xl p-4 border border-border/30')}>
            <AddressSelector
              selectedProvinceId={selectedProvinceId}
              selectedDistrictId={selectedDistrictId}
              selectedWardId={selectedWardId}
              addressDetail={addressDetail}
              onProvinceChange={(id) => {
                setSelectedProvinceId(id);
                setSelectedDistrictId('');
                setSelectedWardId('');
              }}
              onDistrictChange={(id) => {
                setSelectedDistrictId(id);
                setSelectedWardId('');
              }}
              onWardChange={(id) => {
                setSelectedWardId(id);
              }}
              onAddressDetailChange={(detail) => {
                setAddressDetail(detail);
              }}
              onAddressChange={(fullAddress) => {
                // Update formData.address with the full address string
                setFormData(prev => ({ ...prev, address: fullAddress }));
              }}
            />
          </div>
        </div>

        {/* Price fields for Performers */}
        {isPerformer && (
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
            <div className={cn('space-y-2')}>
              <label htmlFor="pricePerHours" className={cn('block text-sm font-semibold text-foreground')}>
                {t('profile.pricePerHour') || 'Price per Hour'}
              </label>
              <input
                id="pricePerHours"
                name="pricePerHours"
                type="number"
                min="0"
                value={formData.pricePerHours || ''}
                onChange={handleChange}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border',
                  'bg-background/50 backdrop-blur-sm text-foreground',
                  'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200 placeholder:text-muted-foreground/50'
                )}
                placeholder="0"
              />
            </div>
            <div className={cn('space-y-2')}>
              <label htmlFor="pricePerSession" className={cn('block text-sm font-semibold text-foreground')}>
                {t('profile.pricePerSession') || 'Price per Session'}
              </label>
              <input
                id="pricePerSession"
                name="pricePerSession"
                type="number"
                min="0"
                value={formData.pricePerSession || ''}
                onChange={handleChange}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border',
                  'bg-background/50 backdrop-blur-sm text-foreground',
                  'border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200 placeholder:text-muted-foreground/50'
                )}
                placeholder="0"
              />
            </div>
          </div>
        )}
        </div>
      );
  };

  return (
    <div 
      className={cn('fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4')}
      onClick={onClose}
    >
      <div 
        className={cn(
          'bg-card/95 backdrop-blur-xl rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col',
          'shadow-[0_25px_70px_rgba(0,0,0,0.4)]',
          'border border-border/30',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('px-8 py-6 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-background/50 to-background/30')}>
          <h3 className={cn('text-2xl font-bold text-foreground')}>
            {t('profile.editProfile') || 'Chỉnh sửa hồ sơ'}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              'transition-all duration-200 active:scale-95',
              'hover:rotate-90'
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={cn('px-8 py-6 overflow-y-auto flex-1')}>
          {errors.submit && (
            <div className={cn(
              'mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm'
            )}>
              {errors.submit}
          </div>
          )}
          {renderFields()}
        </div>

        {/* Footer */}
        <div className={cn('px-8 py-6 border-t border-border/30 flex justify-end gap-4 bg-gradient-to-r from-background/30 to-background/50')}>
          <button
            onClick={onClose}
            disabled={saving}
            className={cn(
              'px-8 py-3 rounded-xl font-semibold',
              'bg-muted/60 text-foreground backdrop-blur-sm',
              'hover:bg-muted/80 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95 border border-border/30'
            )}
          >
            {t('common.cancel') || 'Hủy'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingBackground}
            className={cn(
              'px-8 py-3 rounded-xl font-semibold',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95',
              'flex items-center gap-2 shadow-lg shadow-primary/20',
              'hover:shadow-xl hover:shadow-primary/30'
            )}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? (t('common.saving') || 'Đang lưu...') : (t('common.saveChanges') || 'Lưu thay đổi')}
          </button>
        </div>
      </div>
    </div>
  );
}
