import styles from "./Card.module.css";

export default function Card({ children, tone = "paper", className = "" }) {
  return (
    <section className={`${styles.card} ${styles[tone]} ${className}`.trim()}>
      {children}
    </section>
  );
}
