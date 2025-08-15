import React from 'react';

interface FilterControlsProps {
  filter: string;
  onFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

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
        <option value="all">All Types</option>
        <option value="text">Text</option>
        <option value="image">Images</option>
        <option value="link">Links</option>
        <option value="button">Buttons</option>
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