"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  value: string;
}

export function CustomSelect({
  disabled = false,
  onChange,
  options,
  placeholder = "Selecciona",
  value
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuUpward, setMenuUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updateMenuDirection() {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      const rect = root.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
      setMenuUpward(shouldOpenUpward);
    }

    updateMenuDirection();
    window.addEventListener("resize", updateMenuDirection);
    window.addEventListener("scroll", updateMenuDirection, true);
    return () => {
      window.removeEventListener("resize", updateMenuDirection);
      window.removeEventListener("scroll", updateMenuDirection, true);
    };
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className={`custom-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        className="custom-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="custom-select-value">{selected?.label ?? placeholder}</span>
      </button>
      {open ? (
        <div
          className={`custom-select-menu ${menuUpward ? "upward" : ""}`}
          role="listbox"
        >
          {options.map((option) => (
            <button
              className={`custom-select-option ${option.value === value ? "active" : ""}`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
