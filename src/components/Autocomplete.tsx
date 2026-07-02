import React, { useState, useEffect, useRef } from 'react';

const TEAM_MEMBERS = [
  'Nipit Nakpong',
  'Chaiwat Upprakorn',
  'Franz Mikel Belway Estera',
  'Phanudet Phraekhao',
  'Phornsek Dittakorn',
  'Rattapon Intarathoot',
  'Supang Nuammano',
  'Treesmorn Wanwarawan'
];

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function Autocomplete({ value, onChange, required }: AutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (val.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = TEAM_MEMBERS.filter(member => 
      member.toLowerCase().includes(val.toLowerCase())
    );
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelect = (member: string) => {
    onChange(member);
    setShowSuggestions(false);
  };

  return (
    <div className="input-field" ref={wrapperRef}>
      <input
        type="text"
        placeholder="Enter Team Member Name"
        value={value}
        onChange={handleChange}
        onFocus={() => {
          if (value && suggestions.length > 0) setShowSuggestions(true);
        }}
        required={required}
      />
      <label>Name</label>
      
      {showSuggestions && (
        <div className="autocomplete-suggestions">
          {suggestions.map((member) => (
            <div 
              key={member} 
              className="autocomplete-suggestion"
              onClick={() => handleSelect(member)}
            >
              {member}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
