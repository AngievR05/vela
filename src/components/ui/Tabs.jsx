"use client";

import { useRef } from "react";
import styles from "./PrimitiveControls.module.css";

export default function Tabs({
  label,
  items,
  value,
  onChange,
  className = "",
}) {
  const refs = useRef([]);

  function moveFocus(currentIndex, direction) {
    const enabled = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled);

    const enabledPosition = enabled.findIndex(
      ({ index }) => index === currentIndex
    );

    if (enabledPosition === -1 || enabled.length === 0) return;

    const nextPosition =
      (enabledPosition + direction + enabled.length) % enabled.length;
    refs.current[enabled[nextPosition].index]?.focus();
  }

  function handleKeyDown(event, index) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(index, 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(index, -1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      const first = items.findIndex((item) => !item.disabled);
      refs.current[first]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = [...items]
        .map((item, index) => ({ item, index }))
        .reverse()
        .find(({ item }) => !item.disabled)?.index;

      if (last !== undefined) refs.current[last]?.focus();
    }
  }

  return (
    <div
      className={[styles.tabs, className].filter(Boolean).join(" ")}
      role="tablist"
      aria-label={label}
    >
      {items.map((item, index) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            className={[
              styles.tab,
              active ? styles.tabActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-selected={active}
            aria-controls={item.panelId}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange?.(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
