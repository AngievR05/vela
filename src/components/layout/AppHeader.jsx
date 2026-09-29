"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import IconButton from "@/components/ui/IconButton";
import styles from "./AppHeader.module.css";

export default function AppHeader({
  title,
  type = "root",
  scrolled = false,
  background = "parchment",
  onBack,
  actions = [],
  className = "",
}) {
  const router = useRouter();
  const isRoot = type === "root";
  const visibleActions = actions.slice(0, 2);

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }

  return (
    <header
      className={[
        styles.header,
        background === "paper" ? styles.paper : styles.parchment,
        scrolled ? styles.scrolled : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.bar}>
        <div className={styles.leading}>
          {!isRoot ? (
            <IconButton
              icon={ChevronLeft}
              label="Go back"
              onClick={handleBack}
            />
          ) : null}
        </div>

        <h1
          className={[
            styles.title,
            isRoot ? styles.titleRoot : styles.titleCompact,
          ].join(" ")}
        >
          {title}
        </h1>

        <div className={styles.actions}>
          {visibleActions.map((action, index) => (
            <span className={styles.action} key={index}>
              {action}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
