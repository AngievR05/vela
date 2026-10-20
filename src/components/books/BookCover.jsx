"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {googleCoverUrl} from "@/lib/book-cover-url";
import styles from "@/components/design-system/DesignSystem.module.css";

const SIZE_CLASS = {
  list: styles.coverList,
  current: styles.coverCurrent,
  card: styles.coverCard,
  detail: styles.coverDetail,
  search: styles.coverSearch,
  evidence: styles.coverEvidence,
};

const IMAGE_SIZES = {
  list: "64px",
  current: "72px",
  card: "96px",
  detail: "120px",
  search: "56px",
  evidence: "40px",
};

function initials(title = "") {
  const words = title
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    words
      .slice(0, 3)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "V"
  );
}

function normaliseImageUrl(src) {
  if (!src) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return googleCoverUrl(src);
}

export default function BookCover({
  title,
  author,
  src,
  size = "card",
  decorative = false,
  className = "",
  placeholderType = "initials",
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const [visible,setVisible]=useState(false);
  const frame=useRef(null);
  const retried=useRef(new Set());
  useEffect(()=>{
    if(!failedSrc?.startsWith("/api/library/")||retried.current.has(failedSrc))return;
    retried.current.add(failedSrc);
    const timer=setTimeout(()=>setFailedSrc(current=>current===failedSrc?null:current),65000);
    return()=>clearTimeout(timer);
  },[failedSrc]);
  const alt = decorative
    ? ""
    : `${title || "Book"}${author ? ` by ${author}` : ""}`;

  const imageUrl = normaliseImageUrl(src);
  const lookup=imageUrl?.startsWith("/api/library/");
  useEffect(()=>{
    if(!lookup)return;
    if(typeof IntersectionObserver==="undefined"){const timer=setTimeout(()=>setVisible(true),0);return()=>clearTimeout(timer);}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"100px"});
    if(frame.current)observer.observe(frame.current);
    return()=>observer.disconnect();
  },[lookup,imageUrl]);

  return (
    <div
      ref={frame}
      className={[
        styles.cover,
        SIZE_CLASS[size] ?? styles.coverCard,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {imageUrl && imageUrl !== failedSrc && (!lookup||visible) ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={IMAGE_SIZES[size] ?? "96px"}
          unoptimized
          onError={() => setFailedSrc(imageUrl)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span
          className={styles.coverPlaceholder}
          aria-label={decorative ? undefined : alt}
          aria-hidden={decorative || undefined}
        >
          {placeholderType === "book" ? <><strong>{title}</strong><small>{author}</small></> : initials(title)}
        </span>
      )}
    </div>
  );
}
