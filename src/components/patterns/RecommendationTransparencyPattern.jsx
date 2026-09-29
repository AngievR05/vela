import AIExplanationPanel from "@/components/ai/AIExplanationPanel";
import RecommendationFeedback from "@/components/ai/RecommendationFeedback";
import styles from "@/components/design-system/DesignSystem.module.css";

export default function RecommendationTransparencyPattern({ summary, bookEvidence, dnaEvidence, onCorrect, onFeedback }) {
  return (
    <div className={styles.patternBoundary}>
      <AIExplanationPanel summary={summary} bookEvidence={bookEvidence} dnaEvidence={dnaEvidence} onCorrect={onCorrect}/>
      <RecommendationFeedback onChange={onFeedback}/>
    </div>
  );
}
