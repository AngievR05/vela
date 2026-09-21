"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import styles from "./PrimitiveControls.module.css";

export default function ChoiceRow({
  type = "radio",
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
  name,
  value,
  className = "",
}) {
  const generatedId = useId();
  const inputId = id ?? `vela-choice-${generatedId}`;
  const descriptionId = `${inputId}-description`;
  const isCheckbox = type === "checkbox";

  return (
    <label
      className={[
        styles.choiceRow,
        disabled ? styles.choiceRowDisabled : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        className={styles.choiceNative}
        type={isCheckbox ? "checkbox" : "radio"}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
      />

      <span
        className={[
          styles.choiceMark,
          isCheckbox ? styles.choiceCheckbox : styles.choiceRadio,
        ].join(" ")}
        aria-hidden="true"
      >
        {isCheckbox ? <Check className={styles.choiceCheckIcon} /> : null}
      </span>

      <span className={styles.choiceCopy}>
        <span className={styles.choiceLabel}>{label}</span>
        {description ? (
          <span id={descriptionId} className={styles.choiceDescription}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
