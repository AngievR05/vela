import styles from "./PageArtwork.module.css";

// The prototype's device status bar and home indicator belong to the mockup,
// while the fine book edge is part of Vela's actual page design.
export default function PageArtwork() {
  return <span className={styles.edge} aria-hidden="true" />;
}
