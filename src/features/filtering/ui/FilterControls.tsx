import React from 'react';
import { FILTER_OPTIONS } from '../config/constants';
import { FilterControlsProps } from '../types/filter-types';

export const FilterControls: React.FC<FilterControlsProps> = ({
  filter,
  onFilterChange,
  searchTerm,
  onSearchTermChange,
}) => {
  return (
    <div className="filters">
      <select
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="filter-select"
      >
        {FILTER_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="search-input"
      />
    </div>
  );
};