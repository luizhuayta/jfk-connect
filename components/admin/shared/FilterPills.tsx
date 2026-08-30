"use client";

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  activeClass = "bg-[#1E2A5E] text-white",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  activeClass?: string;
}) {
  return (
    <div className="flex gap-1 bg-gray-50 rounded-xl p-1" role="group">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              active ? activeClass : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="ml-1.5 opacity-70">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
