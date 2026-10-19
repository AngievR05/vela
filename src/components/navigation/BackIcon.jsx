import Image from "next/image";
import styles from "./BackIcon.module.css";

export default function BackIcon() {
  return <Image className={styles.icon} src="/auth/final-back.svg" width={24} height={24} alt="" unoptimized />;
}
