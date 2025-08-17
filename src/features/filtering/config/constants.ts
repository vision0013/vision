export const FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Images' },
  { value: 'link', label: 'Links' },
  { value: 'button', label: 'Buttons' }
] as const;

export type FilterValue = typeof FILTER_OPTIONS[number]['value'];