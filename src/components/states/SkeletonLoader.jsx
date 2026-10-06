import styles from "@/components/design-system/DesignSystem.module.css";

function Block({ className="", style }) {
  return <span aria-hidden="true" className={[styles.skeleton,className].filter(Boolean).join(" ")} style={style}/>;
}

export default function SkeletonLoader({ variant="book-list", label="Loading", className="" }) {
  if (variant === "library") return <div className={[styles.stack,className].filter(Boolean).join(" ")} role="status" aria-label={label}>
    {[0,1,2].map(key => <div key={key} className={styles.skeletonBookRow}>
      <Block style={{width:52,height:72,borderRadius:8}} /><div className={[styles.stack,styles.fill].join(" ")}>
        <Block className={styles.skeletonLine} style={{width:"75%"}} /><Block className={styles.skeletonLine} style={{width:"50%"}} />
      </div>
    </div>)}
  </div>;
  if (variant === "home") return <div className={className} role="status" aria-label={label}>
    <Block /><Block /><div><Block /><Block /><Block /></div><Block /><Block />
  </div>;
  if (variant==="recommendation") return (
    <div className={styles.skeletonRecommendation} role="status" aria-label={label}>
      <Block style={{width:96,aspectRatio:"2 / 3",borderRadius:8}}/>
      <div className={[styles.stack,styles.fill].join(" ")}>
        <Block className={styles.skeletonLine} style={{width:"45%"}}/>
        <Block className={styles.skeletonLine} style={{width:"85%"}}/>
        <Block className={styles.skeletonLine} style={{width:"65%"}}/>
        <Block style={{width:"100%",height:48}}/>
      </div>
    </div>
  );

  if (variant==="current-reading") return (
    <div className={styles.currentReading} role="status" aria-label={label}>
      <div className={styles.row}>
        <Block style={{width:72,aspectRatio:"2 / 3",borderRadius:8}}/>
        <div className={[styles.stack,styles.fill].join(" ")}>
          <Block className={styles.skeletonLine} style={{width:"40%"}}/>
          <Block className={styles.skeletonLine} style={{width:"80%"}}/>
          <Block className={styles.skeletonLine} style={{width:"55%"}}/>
        </div>
      </div>
    </div>
  );

  if (variant==="dna") return (
    <div className={styles.skeletonDna} role="status" aria-label={label}>
      <div className={styles.stack}>
        <Block className={styles.skeletonLine} style={{width:"35%"}}/>
        <Block className={styles.skeletonLine} style={{width:"70%"}}/>
        <Block className={styles.skeletonLine} style={{width:"90%"}}/>
      </div>
    </div>
  );

  return (
    <div className={styles.skeletonBookRow} role="status" aria-label={label}>
      <Block style={{width:64,aspectRatio:"2 / 3",borderRadius:8}}/>
      <div className={[styles.stack,styles.fill].join(" ")}>
        <Block className={styles.skeletonLine} style={{width:"75%"}}/>
        <Block className={styles.skeletonLine} style={{width:"50%"}}/>
        <Block className={styles.skeletonLine} style={{width:"35%"}}/>
      </div>
    </div>
  );
}
