/**
 * Profile Edit Field Configurations
 * Defines fields for each profile type
 * Each field includes: key, type, label, uploadMode?, urlInput?, options?
 */

export const customerProfileFields = [
  {
    key: 'avatar',
    type: 'image',
    label: 'Ảnh đại diện',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'background',
    type: 'image',
    label: 'Ảnh bìa',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'bio',
    type: 'textarea',
    label: 'Tiểu sử',
    placeholder: 'Viết vài dòng giới thiệu về bản thân...',
  },
  {
    key: 'userName',
    type: 'text',
    label: 'Tên',
  },
  {
    key: 'address',
    type: 'address',
    label: 'Địa chỉ',
  },
  {
    key: 'phone',
    type: 'text',
    label: 'Điện thoại',
  },
  {
    key: 'gender',
    type: 'select',
    label: 'Giới tính',
    options: [
      { value: '', label: 'Chọn giới tính' },
      { value: 'Nam', label: 'Nam' },
      { value: 'Nữ', label: 'Nữ' },
      { value: 'Khác', label: 'Khác' },
    ],
  },
];

export const barProfileFields = [
  {
    key: 'Avatar',
    type: 'image',
    label: 'Ảnh đại diện',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'Background',
    type: 'image',
    label: 'Ảnh bìa',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'Bio',
    type: 'textarea',
    label: 'Tiểu sử',
    placeholder: 'Nhập tiểu sử...',
  },
  {
    key: 'BarName',
    type: 'text',
    label: 'Tên quán',
  },
  {
    key: 'Address',
    type: 'address',
    label: 'Địa chỉ',
  },
  {
    key: 'PhoneNumber',
    type: 'text',
    label: 'Điện thoại',
  },
  {
    key: 'Email',
    type: 'email',
    label: 'Email',
  },
];

export const djProfileFields = [
  {
    key: 'avatar',
    type: 'image',
    label: 'Ảnh đại diện',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'background',
    type: 'image',
    label: 'Ảnh bìa',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'userName',
    type: 'text',
    label: 'Tên',
  },
  {
    key: 'address',
    type: 'address',
    label: 'Địa chỉ',
  },
  {
    key: 'phone',
    type: 'text',
    label: 'Điện thoại',
  },
  {
    key: 'gender',
    type: 'select',
    label: 'Giới tính',
    options: [
      { value: '', label: 'Chọn giới tính' },
      { value: 'male', label: 'Nam' },
      { value: 'female', label: 'Nữ' },
      { value: 'other', label: 'Khác' },
    ],
  },
  {
    key: 'pricePerHours',
    type: 'number',
    label: 'Giá/giờ (VNĐ)',
  },
  {
    key: 'pricePerSession',
    type: 'number',
    label: 'Giá/buổi (VNĐ)',
  },
  {
    key: 'bio',
    type: 'textarea',
    label: 'Tiểu sử',
    placeholder: 'Nhập tiểu sử...',
  },
];

export const dancerProfileFields = [
  {
    key: 'avatar',
    type: 'image',
    label: 'Ảnh đại diện',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'background',
    type: 'image',
    label: 'Ảnh bìa',
    uploadMode: true,
    urlInput: true,
  },
  {
    key: 'userName',
    type: 'text',
    label: 'Tên',
  },
  {
    key: 'address',
    type: 'address',
    label: 'Địa chỉ',
  },
  {
    key: 'phone',
    type: 'text',
    label: 'Điện thoại',
  },
  {
    key: 'gender',
    type: 'select',
    label: 'Giới tính',
    options: [
      { value: '', label: 'Chọn giới tính' },
      { value: 'male', label: 'Nam' },
      { value: 'female', label: 'Nữ' },
      { value: 'other', label: 'Khác' },
    ],
  },
  {
    key: 'pricePerHours',
    type: 'number',
    label: 'Giá/giờ (VNĐ)',
  },
  {
    key: 'pricePerSession',
    type: 'number',
    label: 'Giá/buổi (VNĐ)',
  },
  {
    key: 'bio',
    type: 'textarea',
    label: 'Tiểu sử',
    placeholder: 'Nhập tiểu sử...',
  },
];

