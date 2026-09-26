export const PAGE_CONTAINER_SIZES = [
  { name: 'narrow', className: 'max-w-narrow' },
  { name: 'default', className: 'max-w-default' },
  { name: 'wide', className: 'max-w-wide' },
  { name: 'full', className: 'max-w-full' },
] as const

export type PageContainerSize = (typeof PAGE_CONTAINER_SIZES)[number]['name']

export const getPageContainerSizeClass = (size: PageContainerSize) =>
  PAGE_CONTAINER_SIZES.find(({ name }) => name === size)?.className ??
  PAGE_CONTAINER_SIZES[1].className
