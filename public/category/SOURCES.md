# Category photo sources

All seven are licensed under the [Unsplash License](https://unsplash.com/license) —
free for commercial use, no attribution required. Kept here as a paper
trail in case these ever need to be swapped or the license needs
re-verifying.

| File | Category | Source |
|---|---|---|
| `full-systems.jpg` | Prebuilt PCs | https://unsplash.com/photos/black-and-blue-computer-tower-EOAKUQcsFIU |
| `pc-parts.jpg` | Graphics Cards | https://unsplash.com/photos/a-close-up-of-a-graphics-card-on-a-table-TErYPw4o1KM |
| `processors.jpg` | Processors | https://unsplash.com/photos/close-up-of-a-computer-processor-chip-on-circuit-board-cMoE2tU_BbM |
| `laptops.jpg` | Laptops | https://unsplash.com/photos/laptop-with-colorful-rgb-keyboard-and-lighting-orbGnwhoyp8 |
| `monitors.jpg` | Monitors | https://unsplash.com/photos/a-computer-monitor-sitting-on-top-of-a-desk-LS-Be4rUjFo |
| `peripherals.jpg` | Peripherals | https://unsplash.com/photos/black-mechanical-keyboard-qccxs7CWhYw |
| `consoles.jpg` | Consoles | https://unsplash.com/photos/a-video-game-console-sitting-on-top-of-a-table-CYpPNooT1NA |

Used two ways — see `lib/category-photos.ts`:
1. The four homepage category tiles (`app/page.tsx`), purely navigational,
   not tied to any specific listing.
2. Fallback art for any listing with no seller-uploaded photo
   (`components/ProductImage.tsx`), always paired with a visible
   "Stock photo" badge so it's never mistaken for a real photo of the
   specific used item — don't remove that badge if this fallback ever
   changes again.
