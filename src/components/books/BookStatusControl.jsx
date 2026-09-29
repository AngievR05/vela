"use client";
import { BookOpen, Bookmark, CheckCircle2, CircleSlash2, ChevronDown } from "lucide-react";
import styles from "@/components/design-system/DesignSystem.module.css";

const STATUS = {
  want_to_read:{label:"Want to Read",icon:Bookmark,className:styles.statusWant},
  reading:{label:"Reading",icon:BookOpen,className:styles.statusReading},
  finished:{label:"Finished",icon:CheckCircle2,className:styles.statusFinished},
  dnf:{label:"DNF",icon:CircleSlash2,className:styles.statusDnf},
};

export default function BookStatusControl({ status="want_to_read", editable=false, onClick, disabled=false, className="" }) {
  const config = STATUS[status] ?? STATUS.want_to_read;
  const Icon = config.icon;
  const content = (
    <span className={[styles.statusPill, config.className].join(" ")}>
      <Icon size={16} aria-hidden="true" />
      <span>{config.label}</span>
      {editable ? <ChevronDown size={16} aria-hidden="true" /> : null}
    </span>
  );
  if (!editable) return <span className={className}>{content}</span>;
  return (
    <button type="button" className={[styles.statusButton,className].filter(Boolean).join(" ")}
      onClick={onClick} disabled={disabled} aria-label={`Status: ${config.label}. Change status`}>
      {content}
    </button>
  );
}
