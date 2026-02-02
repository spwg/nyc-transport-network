import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { useMapStore } from '@/stores/mapStore';
import { useTransitData } from '@/hooks/useTransitData';
import { TRANSIT_SYSTEMS } from '@/constants/systems';
import type { Station } from '@/types/transit';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { selectStation, zoomToStation } = useMapStore();
  const { stations } = useTransitData();

  const fuse = useMemo(() => {
    return new Fuse(stations, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [stations]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 10);
  }, [fuse, query]);

  const handleSelect = useCallback(
    (station: Station) => {
      selectStation(station);
      zoomToStation(station);
      setQuery('');
      setIsOpen(false);
      setSelectedIndex(0);
    },
    [selectStation, zoomToStation]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex].item);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(0);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, selectedIndex, handleSelect]
  );

  useEffect(() => {
    if (query.trim()) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  const getSystemName = (systemId: string) => {
    const system = TRANSIT_SYSTEMS.find((s) => s.id === systemId);
    return system?.name || systemId;
  };

  const getSystemColor = (systemId: string) => {
    const system = TRANSIT_SYSTEMS.find((s) => s.id === systemId);
    return system?.color || '#888888';
  };

  return (
    <div className="search-panel">
      <h3>Search Stations</h3>
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search stations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul ref={listRef} className="search-results">
          {results.map((result, index) => (
            <li
              key={result.item.id}
              className={`search-result ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(result.item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="result-name">{result.item.name}</span>
              <span
                className="result-system"
                style={{ backgroundColor: getSystemColor(result.item.systemId) }}
              >
                {getSystemName(result.item.systemId).split(' ')[0]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="search-no-results">No stations found</div>
      )}
    </div>
  );
}
