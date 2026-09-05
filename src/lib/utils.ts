import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Every custom utility in `src/styles/theme.css` has to be declared here, or
 * `cn()` cannot resolve it against the Tailwind class it conflicts with:
 *
 * - typography levels are `text-*` utilities, and tailwind-merge otherwise
 *   reads them as text COLORS and silently drops the real colour class (this
 *   caused unreadable buttons before it was fixed);
 * - `bg-primary-gradient*` paints a background, so a caller passing `bg-card`
 *   must win over it rather than fighting it on CSS source order;
 * - `transition-ui` belongs to the same group as `transition-colors`;
 * - `px-gutter` is horizontal padding and `bleed-gutter` horizontal margin.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-color': ['bg-primary-gradient', 'bg-primary-gradient-soft'],
      transition: ['transition-ui'],
      px: ['px-gutter'],
      mx: ['bleed-gutter'],
      'font-size': [
        {
          text: [
            'display',
            'heading-1',
            'heading-2',
            'heading-3',
            'title',
            'body',
            'body-small',
            'label',
            'caption',
            'metric',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
