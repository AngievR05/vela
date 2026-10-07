"use client";
import Image from "next/image";
import styles from "./ReadingStats.module.css";
const colors = ["#183b34", "#5d3648", "#665f84", "#8d733e", "#47423e", "#766f68"];
const swatches = ["print", "ebook", "literary", "scifi"];
export function StatsMetrics({ stats, home = false, year, onSelect }) {
  const labels = [home ? `finished in ${year}` : "books finished", "pages in finished books", `from ${stats.rated} ${home ? "ratings" : "rated books"}`];
  return <><div className={`${styles.metrics} ${home ? styles.homeMetrics : ""}`}>
    {[stats.total, !stats.knownPages && stats.total ? "—" : stats.pages.toLocaleString(), stats.average].map((value, i) => onSelect ? <button type="button" key={i} onClick={() => onSelect(i)} aria-label={`${value} ${labels[i]}`}><strong>{value}</strong><p>{labels[i]}</p></button> : <a key={i} href={i === 2 ? "/stats?view=ratings" : "/stats?view=books"} aria-label={`${value} ${labels[i]}`}><strong>{value}</strong><p>{labels[i]}</p></a>)}
  </div>{stats.knownPages < stats.total && <p className={styles.muted}>Page total includes {stats.knownPages} of {stats.total} recorded book lengths.</p>}</>;
}
export function CountBars({ items, onSelect, compact = false, month = false }) {
  const max = Math.max(1, ...items.map(item => item.count));
  return <div className={`${styles.bars} ${compact ? styles.compactBars : ""} ${month ? styles.monthBars : ""}`} aria-label="Counts by category">
    {items.map((item, index) => <button key={item.key} type="button" disabled={!onSelect} onClick={() => onSelect?.(item)} aria-label={`${item.label}: ${item.count} books`}>
      <span>{item.count}</span><i aria-hidden="true" style={{ height: item.count ? `${Math.min(compact ? 64 : 110, item.count * (compact ? 24 : 48), item.count / max * (compact ? 64 : 110))}px` : "3px", backgroundColor: item.count ? month ? compact && index === items.length - 1 ? "#75465a" : colors[0] : colors[index % colors.length] : "#d9ded7" }}/><small>{item.label}</small>
    </button>)}
  </div>;
}
export function CountDonut({ items, total, onSelect }) {
  const active = items.filter(item => item.count > 0);
  const segments = active.map((item, i) => {
    const start = active.slice(0, i).reduce((sum, entry) => sum + entry.count, 0) / Math.max(1, total) * 100;
    const end = start + item.count / Math.max(1, total) * 100;
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  });
  return <div className={styles.donutRow}>
    <div className={styles.donut} aria-hidden="true" style={{ background: segments.length ? `conic-gradient(${segments.join(",")})` : "#d9ded7" }}><strong>{total}</strong></div>
    <div className={styles.legend}>{items.filter(item => item.count > 0).map((item, i) => <button type="button" key={item.key} disabled={!onSelect} onClick={() => onSelect?.(item)}>
      {i < 4 ? <Image src={`/reading-stats/swatch-${swatches[i]}.svg`} width={10} height={10} alt="" unoptimized/> : <i style={{ background: colors[i % colors.length] }}/>}<span>{item.label} · {item.count}</span>
    </button>)}</div>
  </div>;
}
