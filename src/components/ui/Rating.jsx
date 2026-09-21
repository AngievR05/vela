"use client";

import { Star } from "lucide-react";
import { useRef } from "react";
import styles from "./PrimitiveControls.module.css";

export default function Rating({
  label = "Book rating",
  value = 0,
  onChange,
  disabled = false,
  className = "",
}) {
  const refs = useRef([]);
  const safeValue = Math.min(5, Math.max(0, Number(value) || 0));

  function setRating(nextValue) {
    if (!disabled) onChange?.(nextValue);
  }

  function handleKeyDown(event, index) {
    if (disabled) return;

    let nextIndex = null;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextIndex = Math.min(4, index + 1);
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextIndex = Math.max(0, index - 1);
    }

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = 4;

    if (nextIndex !== null) {
      event.preventDefault();
      refs.current[nextIndex]?.focus();
      setRating(nextIndex + 1);
    }
  }

  return (
    <div
      className={[styles.ratingGroup, className].filter(Boolean).join(" ")}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
    >
      <div className={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map((rating, index) => {
          const selected = rating <= safeValue;
          const current = rating === safeValue;

          return (
            <button
              key={rating}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              className={styles.ratingButton}
              aria-label={`Rate ${rating} out of 5`}
              aria-checked={current}
              tabIndex={current || (safeValue === 0 && rating === 1) ? 0 : -1}
              disabled={disabled}
              onClick={() => setRating(rating)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <Star
                className={[
                  styles.ratingStar,
                  selected ? styles.ratingStarSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <span className={styles.ratingValue} aria-live="polite">
        {safeValue === 0 ? "Not rated" : `${safeValue}/5`}
      </span>
    </div>
  );
}
