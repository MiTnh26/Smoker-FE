# Border Patterns Usage Guide

File `border-patterns.js` cung cấp các utilities để quản lý border styles một cách centralized và dễ maintain.

## Import

```javascript
import { 
  borderWidths, 
  borderColors, 
  borderRadius, 
  borders, 
  borderStyles,
  createBorder,
  createBorderOnly
} from '@/utils/border-patterns';
```

## Cách sử dụng

### 1. Sử dụng pre-composed patterns (Khuyến nghị)

```javascript
import { borderStyles, borders } from '@/utils/border-patterns';
import { cn } from '@/utils/cn';

// Card với border Instagram style
<div className={cn(borderStyles.card, "p-4")}>
  Content
</div>

// Input với border
<input className={cn(borderStyles.input, "px-4 py-2")} />

// Divider
<div className={cn(borderStyles.dividerTop, "pt-4")} />
```

### 2. Sử dụng individual patterns

```javascript
import { borderWidths, borderColors, borderRadius } from '@/utils/border-patterns';

// Tự compose
<div className={cn(
  borderWidths.thin,      // border-[0.5px]
  borderColors.light,     // border-border/20
  borderRadius.lg         // rounded-lg
)}>
  Content
</div>
```

### 3. Sử dụng helper functions

```javascript
import { createBorder, createBorderOnly } from '@/utils/border-patterns';

// Tạo border với width, color, và radius
<div className={cn(createBorder("thin", "light", "lg"))}>
  // border-[0.5px] border-border/20 rounded-lg
</div>

// Tạo border chỉ với width và color (không có radius)
<div className={cn(createBorderOnly("base", "medium"), "rounded-lg")}>
  // border border-border/40 rounded-lg
</div>
```

## Các patterns có sẵn

### Border Widths
- `borderWidths.none` - border-0
- `borderWidths.thin` - border-[0.5px] (Instagram style - mỏng nhất)
- `borderWidths.base` - border (1px)
- `borderWidths.medium` - border-2
- `borderWidths.thick` - border-4

### Border Colors (với opacity)
- `borderColors.subtle` - border-border/10 (rất nhạt)
- `borderColors.light` - border-border/20 (Instagram style - nhạt)
- `borderColors.base` - border-border/30 (mặc định)
- `borderColors.medium` - border-border/40 (rõ hơn)
- `borderColors.strong` - border-border/50 (rõ)
- `borderColors.primary` - border-primary/40
- `borderColors.primaryStrong` - border-primary
- `borderColors.danger` - border-danger/30
- `borderColors.success` - border-success/30

### Border Radius
- `borderRadius.none` - rounded-none
- `borderRadius.sm` - rounded-sm (2px)
- `borderRadius.base` - rounded (4px)
- `borderRadius.md` - rounded-md (6px)
- `borderRadius.lg` - rounded-lg (8px) (Instagram style - vừa phải)
- `borderRadius.xl` - rounded-xl (12px)
- `borderRadius["2xl"]` - rounded-2xl (16px)
- `borderRadius.full` - rounded-full (100%)

### Pre-composed Borders
- `borders.card` - border-[0.5px] border-border/20
- `borders.cardHover` - border-[0.5px] border-border/30
- `borders.input` - border-[0.5px] border-border/20
- `borders.inputFocus` - border-[0.5px] border-primary/40
- `borders.divider` - border border-border/30
- `borders.header` - border border-border/40
- `borders.avatar` - border-2 border-primary/20
- `borders.active` - border border-primary

### Complete Border Styles (với radius)
- `borderStyles.card` - Card với border Instagram style
- `borderStyles.input` - Input với border Instagram style
- `borderStyles.button` - border-none (buttons không có viền)
- `borderStyles.dividerTop` - border-t border-border/30
- `borderStyles.dividerBottom` - border-b border-border/30
- `borderStyles.avatar` - Avatar với border và rounded-2xl
- `borderStyles.avatarFull` - Avatar tròn hoàn toàn

## Ví dụ thực tế

### PostCard
```javascript
import { borderStyles } from '@/utils/border-patterns';

<article className={cn(
  borderStyles.card,           // border-[0.5px] border-border/20 rounded-lg
  "bg-card p-4 mb-4",
  "hover:" + borderStyles.cardHover  // hover:border-[0.5px] hover:border-border/30
)}>
  ...
</article>
```

### Input Field
```javascript
import { borderStyles } from '@/utils/border-patterns';

<input className={cn(
  borderStyles.input,          // border-[0.5px] border-border/20 rounded-lg
  "px-4 py-3",
  "focus:" + borderStyles.inputFocus  // focus:border-[0.5px] focus:border-primary/40
)} />
```

### Modal
```javascript
import { borderStyles } from '@/utils/border-patterns';

<div className={cn(
  borderStyles.card,           // border-[0.5px] border-border/20 rounded-lg
  "bg-card max-w-[520px]",
  "shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
)}>
  ...
</div>
```

## Lợi ích

1. **Consistency**: Tất cả components dùng cùng border patterns
2. **Maintainability**: Chỉ cần sửa một chỗ để thay đổi toàn bộ
3. **Type Safety**: Có thể thêm TypeScript types sau
4. **Documentation**: Dễ hiểu và sử dụng
5. **Instagram Style**: Đã được tối ưu theo phong cách Instagram (viền mỏng, bo góc vừa phải)

## Cập nhật border patterns

Khi cần thay đổi độ dày viền hoặc màu sắc, chỉ cần sửa trong file `border-patterns.js`:

```javascript
// Ví dụ: Muốn thay đổi border card từ thin sang base
export const borders = {
  card: `${borderWidths.base} ${borderColors.light}`,  // Thay đổi từ thin sang base
  // ...
};
```

Tất cả components sử dụng `borders.card` sẽ tự động cập nhật!

