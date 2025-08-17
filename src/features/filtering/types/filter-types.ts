export interface FilterControlsProps {
  filter: string;
  onFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export type { FilterValue } from '../config/constants';