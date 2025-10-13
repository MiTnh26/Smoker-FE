# ProfileSetup Component - Figma Design Specifications

## Design System

### Color Palette
- **Primary**: Teal (#14b8a6) - Main actions, focus states
- **Primary Dark**: Teal Dark (#0d9488) - Hover states
- **Primary Light**: Teal Light (#f0fdfa) - Background accents
- **Neutral**: Gray scale (50-900) - Text, borders, backgrounds
- **Success**: Green (#10b981) - Success messages
- **Error**: Red (#ef4444) - Error states, validation

### Typography
- **Heading**: Inter Bold, 30px (text-3xl)
- **Subheading**: Inter Semibold, 18px (text-lg)
- **Body**: Inter Regular, 16px (text-base)
- **Label**: Inter Medium, 14px (text-sm)
- **Helper**: Inter Regular, 14px (text-sm), muted color

### Spacing Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

## Desktop Layout (1024px+)

### Artboard Specifications
- **Width**: 1024px
- **Height**: 768px (minimum, scrollable)
- **Background**: #f9fafb (gray-50)

### Container
- **Max Width**: 1024px
- **Padding**: 32px (px-8)
- **Centered**: Auto margins

### Header Section
- **Title**: "Hoàn thiện hồ sơ"
  - Font: Inter Bold, 30px
  - Color: #111827 (gray-900)
  - Margin Bottom: 8px
- **Subtitle**: Descriptive text
  - Font: Inter Regular, 16px
  - Color: #6b7280 (gray-600)
  - Max Width: 512px
  - Centered
- **Spacing**: 32px bottom margin

### Two-Column Grid
- **Grid**: CSS Grid, 2 columns, 32px gap
- **Left Column**: Form (flex: 1)
- **Right Column**: Preview (flex: 1)

### Form Card
- **Background**: White (#ffffff)
- **Border**: 1px solid #e5e7eb (gray-200)
- **Border Radius**: 16px (rounded-2xl)
- **Shadow**: Subtle (shadow-sm)
- **Padding**: 32px (p-8)

### Form Fields
- **Spacing**: 24px between fields (space-y-6)
- **Label**: Inter Medium, 14px, #374151 (gray-700)
- **Required Indicator**: Red asterisk (#ef4444)
- **Input**: 
  - Height: 48px (py-3)
  - Padding: 16px horizontal (px-4)
  - Border: 1px solid #d1d5db (gray-300)
  - Border Radius: 12px (rounded-xl)
  - Focus: 2px teal ring, teal border
- **Error State**: Red border (#fca5a5), red background (#fef2f2)
- **Textarea**: Same styling, 4 rows, no resize

### Preview Card
- **Background**: White (#ffffff)
- **Border**: 1px solid #e5e7eb (gray-200)
- **Border Radius**: 16px (rounded-2xl)
- **Shadow**: Subtle (shadow-sm)
- **Padding**: 32px (p-8)

### Profile Preview
- **Container**: Gradient background (teal-50 to blue-50)
- **Border Radius**: 12px (rounded-xl)
- **Padding**: 24px (p-6)
- **Background Image**: 128px height, cover, rounded corners
- **Avatar**: 64px circle, white border, shadow
- **Fallback**: Teal background with initial letter

### Submit Button
- **Width**: Full width
- **Height**: 48px (py-3)
- **Background**: Teal (#14b8a6)
- **Hover**: Darker teal (#0d9488)
- **Disabled**: Gray (#d1d5db)
- **Text**: White, Inter Medium, 16px
- **Border Radius**: 12px (rounded-xl)
- **Loading State**: Spinner + "Đang lưu..." text

## Mobile Layout (375px)

### Artboard Specifications
- **Width**: 375px
- **Height**: 812px (iPhone 12 Pro)
- **Background**: #f9fafb (gray-50)

### Container
- **Padding**: 16px (px-4)
- **Max Width**: 100%

### Header Section
- **Title**: Inter Bold, 24px (text-2xl)
- **Subtitle**: Inter Regular, 14px (text-sm)
- **Margin Bottom**: 24px (mb-6)

### Single Column Layout
- **Stack**: Vertical stack, 24px gap
- **Form Card**: Full width, 24px padding (p-6)
- **Preview Card**: Full width, 24px padding (p-6)

### Form Adjustments
- **Input Height**: 44px (mobile-friendly)
- **Spacing**: 20px between fields (space-y-5)
- **Button**: Full width, 44px height

### Preview Adjustments
- **Background Image**: 100px height
- **Avatar**: 56px circle
- **Spacing**: Reduced padding (16px)

## Component States

### Default State
- All inputs: Gray border, white background
- Submit button: Enabled (teal), disabled (gray)

### Focus State
- Input: Teal ring (2px), teal border
- Button: Darker teal background

### Error State
- Input: Red border, red background tint
- Error message: Red text, 14px, below input

### Loading State
- Submit button: Spinner animation, "Đang lưu..." text
- Form: Disabled inputs

### Success State
- Success message: Green background, green text
- Auto-redirect after 1.5 seconds

## Accessibility Guidelines

### Color Contrast
- **Text on White**: 4.5:1 minimum
- **Text on Teal**: 4.5:1 minimum
- **Focus Indicators**: 3:1 minimum

### Interactive Elements
- **Minimum Touch Target**: 44px (mobile)
- **Focus Indicators**: 2px outline, high contrast
- **Hover States**: Subtle color changes

### Typography
- **Line Height**: 1.5 minimum
- **Font Size**: 16px minimum for body text
- **Font Weight**: Medium for interactive elements

## Export Specifications

### Desktop
- **Format**: PNG, 2x resolution
- **Dimensions**: 2048x1536px
- **Background**: Transparent or white

### Mobile
- **Format**: PNG, 2x resolution
- **Dimensions**: 750x1624px
- **Background**: Transparent or white

### Assets
- **Icons**: SVG format, 24px base size
- **Images**: WebP format, optimized
- **Fonts**: WOFF2 format, fallbacks

## Implementation Notes

### CSS Classes
Use TailwindCSS utility classes for consistency:
- `rounded-2xl` for card corners
- `shadow-sm` for subtle shadows
- `focus:ring-2 focus:ring-teal-500` for focus states
- `space-y-6` for vertical spacing
- `grid grid-cols-1 lg:grid-cols-2` for responsive grid

### Responsive Breakpoints
- **Mobile**: < 768px (single column)
- **Tablet**: 768px - 1023px (single column)
- **Desktop**: 1024px+ (two columns)

### Animation
- **Transitions**: 200ms ease-in-out
- **Loading Spinner**: CSS animation, 1s duration
- **Hover Effects**: Subtle scale or color changes
