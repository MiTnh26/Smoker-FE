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
      
      // Remove empty fields
      for (const key of Object.keys(data)) {
        if (data[key] === '' || data[key] === null || data[key] === undefined) {
          delete data[key];
        }
      }

      switch (profileType) {
        case 'Account':
          res = await userApi.updateProfile(data);
          break;
        case 'BarPage':
          // With the improved data flow, `profile.id` is now guaranteed to be the correct BarPageId.
          // `profile.EntityAccountId` holds the entity account ID.
          const barPageId = profile.id || profile.Id;
          if (!barPageId) {
            console.error("BarPageId is missing from profile object in ProfileEditModal", profile);
            setErrors({ submit: "Internal Error: Bar ID is missing. Cannot save." });
            setSaving(false);
            return;
    }
          const barData = { ...data };
          // Map userName to BarName for BarPage API
          if (barData.userName && !barData.BarName) {
            barData.BarName = barData.userName;
          }
          res = await barPageApi.updateBarPage(barPageId, barData);
          break;
        case 'BusinessAccount':
          res = await businessApi.updateBusiness(profile.id || profile.Id, data);
          break;
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
      <div className={cn('space-y-6')}>
        {/* Avatar & Background */}
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
          <div>
            <label className={cn('block text-sm font-semibold text-foreground mb-2')}>
              {t('profile.avatar') || 'Avatar'}
            </label>
            <ImageUploadField 
              label="" 
              value={formData.avatar} 
              onChange={url => setFormData(p => ({...p, avatar: url}))} 
              uploading={uploadingAvatar} 
              onUploadStateChange={setUploadingAvatar} 
            />
          </div>
          <div>
            <label className={cn('block text-sm font-semibold text-foreground mb-2')}>
              {t('profile.background') || 'Background'}
            </label>
          <ImageUploadField
              label="" 
              value={formData.background} 
              onChange={url => setFormData(p => ({...p, background: url}))} 
              uploading={uploadingBackground} 
              onUploadStateChange={setUploadingBackground} 
          />
        </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="userName" className={cn('block text-sm font-semibold text-foreground mb-2')}>
            {t('profile.name') || 'Name'} <span className={cn('text-danger')}>*</span>
          </label>
          <input
            id="userName"
            name="userName"
            type="text"
            value={formData.userName || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border',
              'bg-background text-foreground',
              'border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200',
              errors.userName && 'border-danger focus:border-danger focus:ring-danger/20'
            )}
            placeholder={t('profile.namePlaceholder') || 'Enter your name'}
          />
          {errors.userName && (
            <p className={cn('mt-1 text-sm text-danger')}>{errors.userName}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className={cn('block text-sm font-semibold text-foreground mb-2')}>
            {t('profile.bio') || 'Bio'}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={formData.bio || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border resize-none',
              'bg-background text-foreground',
              'border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200'
            )}
            placeholder={t('profile.bioPlaceholder') || 'Tell us about yourself...'}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={cn('block text-sm font-semibold text-foreground mb-2')}>
            {t('profile.phone') || 'Phone'}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-2.5 rounded-lg border',
              'bg-background text-foreground',
              'border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-200'
            )}
            placeholder={t('profile.phonePlaceholder') || 'Enter your phone number'}
          />
        </div>

        {/* Address - AddressSelector with dropdowns */}
          <div>
          <label className={cn('block text-sm font-semibold text-foreground mb-2')}>
            {t('profile.address') || 'Address'}
          </label>
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

        {/* Price fields for Performers */}
        {isPerformer && (
          <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
            <div>
              <label htmlFor="pricePerHours" className={cn('block text-sm font-semibold text-foreground mb-2')}>
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
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-background text-foreground',
                  'border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200'
                )}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="pricePerSession" className={cn('block text-sm font-semibold text-foreground mb-2')}>
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
                  'w-full px-4 py-2.5 rounded-lg border',
                  'bg-background text-foreground',
                  'border-border focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200'
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
          'bg-card rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col',
          'shadow-[0_20px_60px_rgba(0,0,0,0.3)]',
          'border border-border/50'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('p-6 border-b border-border/50 flex items-center justify-between')}>
          <h3 className={cn('text-2xl font-bold text-foreground')}>
            {t('profile.editProfile') || 'Edit Profile'}
          </h3>
          <button
            onClick={onClose}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              'transition-all duration-200 active:scale-95'
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className={cn('p-6 overflow-y-auto flex-1')}>
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
        <div className={cn('p-6 border-t border-border/50 flex justify-end gap-3')}>
          <button
            onClick={onClose}
            disabled={saving}
            className={cn(
              'px-6 py-2.5 rounded-lg font-semibold',
              'bg-muted text-foreground',
              'hover:bg-muted/80 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95'
            )}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploadingAvatar || uploadingBackground}
            className={cn(
              'px-6 py-2.5 rounded-lg font-semibold',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95',
              'flex items-center gap-2'
            )}
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? (t('common.saving') || 'Saving...') : (t('common.saveChanges') || 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
