"use client";

import Link from "next/link";
import styles from "./SectionHeader.module.css";

const HEADING_TAGS = {
  h2: "h2",
  h3: "h3",
  compact: "h3",
};

export default function SectionHeader({
  title,
  description,
  size = "h3",
  actionLabel,
  actionHref,
  onAction,
  className = "",
}) {
  const Heading = HEADING_TAGS[size] ?? "h3";

  const action = actionLabel ? (
    actionHref ? (
      <Link className={styles.action} href={actionHref}>
        {actionLabel}
      </Link>
    ) : (
      <button
        type="button"
        className={styles.action}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div
      className={[
        styles.sectionHeader,
        styles[size] ?? styles.h3,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.topRow}>
        <Heading className={styles.title}>{title}</Heading>
        {action}
      </div>

      {description ? (
        <p className={styles.description}>{description}</p>
      ) : null}
    </div>
  );
}
