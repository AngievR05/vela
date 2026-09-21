import styles from "./Button.module.css";

export default function Button({
  as: Component = "button",
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <Component
      className={`${styles.button} ${styles[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
