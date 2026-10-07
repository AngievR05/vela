import Image from "next/image";
import styles from "./ReadingStats.module.css";
export default function ReadingArtwork({ home = false }) {
  const prefix = home ? "home" : "stats";
  return <div className={styles.art} aria-hidden="true">
    <Image className={styles.arch} src={`/reading-stats/${prefix}-blushreadingarch.svg`} width={330} height={420} alt="" unoptimized priority />
    <Image className={styles.mist} src={`/reading-stats/${prefix}-mistpool.svg`} width={430} height={440} alt="" unoptimized />
    <Image className={styles.orbit} src={`/reading-stats/${prefix}-brassorbit.svg`} width={300} height={350} alt="" unoptimized />
    <span className={styles.edge}/><span className={styles.rule}/>
  </div>;
}
