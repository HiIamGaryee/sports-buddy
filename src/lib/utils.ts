import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Our typography levels (src/styles/theme.css) are custom `text-*` utilities.
 * tailwind-merge must know they are font sizes, otherwise it treats them as
 * text colors and silently drops the real color class.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
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
