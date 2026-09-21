"use client";

import { Search, X } from "lucide-react";
import { useId, useRef } from "react";
import IconButton from "./IconButton";
import styles from "./PrimitiveControls.module.css";

export default function SearchField({
  label,
  value,
  onChange,
  onClear,
  placeholder = "Search title or author",
  id,
  disabled = false,
  helperText,
  className = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? `vela-search-${generatedId}`;
  const helperId = `${inputId}-helper`;
  const inputRef = useRef(null);
  const hasValue = Boolean(value);

  function clearSearch() {
    onClear?.();

    if (!onClear && onChange) {
      onChange({ target: { value: "" } });
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <label className={styles.fieldLabel} htmlFor={inputId}>
        {label}
      </label>

      <div
        className={[
          styles.fieldRow,
          styles.searchRow,
          disabled ? styles.fieldRowDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Search className={styles.searchIcon} aria-hidden="true" />

        <input
          ref={inputRef}
          id={inputId}
          type="search"
          className={[styles.input, styles.searchInput].join(" ")}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={helperText ? helperId : undefined}
          {...props}
        />

        {hasValue && !disabled ? (
          <div className={styles.trailingAction}>
            <IconButton
              icon={X}
              label={`Clear ${label.toLowerCase()}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearSearch}
            />
          </div>
        ) : null}
      </div>

      {helperText ? (
        <p id={helperId} className={styles.fieldMessage}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
