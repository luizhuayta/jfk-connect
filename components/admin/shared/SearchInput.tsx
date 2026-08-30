"use client";

import { useId } from "react";
import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const id = useId();
  return (
    <div className="relative ml-auto">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 bg-white w-64 max-w-full focus:outline-none focus:ring-2 focus:ring-[#1E2A5E]/20 focus:border-[#1E2A5E]"
      />
    </div>
  );
}
