import SkeletonLoader from "./SkeletonLoader";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function LoadingState({ variant="book-list", count=3, label="Loading content" }) {
  return (
    <div className={styles.stack} aria-busy="true">
      {Array.from({length:count},(_,index)=>(
        <SkeletonLoader key={index} variant={variant} label={index===0?label:undefined}/>
      ))}
    </div>
  );
}
