// Presentation labels are interpretations, never measured accuracy scores.
export function recommendationPresentation(confidence) {
  const explore = confidence === "Good match";
  const experimental = confidence === "Experimental";
  return {
    heroLabel: explore || experimental ? "Vela recommendation" : "Strong match",
    outlined: explore || experimental,
    expandExplanation: explore || experimental,
    keepExplanationBook: explore || experimental,
    explanationSubtitle: explore ? "Inspect the evidence" : "Book facts and personal signals",
    detailSubtitle: confidence === "Strong match" ? "Based on your current request" : "Why this may fit",
  };
}

export function recommendationBackStage(stage, confidence, correctionOrigin = "assumptions") {
  if (stage === "correction") return correctionOrigin;
  if (["why", "saved"].includes(stage) && confidence === "Experimental") return "detail";
  if (stage === "book") return "detail";
  return "results";
}

export function savedRecommendationShelf(book) {
  const status = ["reading", "want_to_read", "finished", "dnf"].includes(book?.status)
    ? book.status : "want_to_read";
  return `/library?tab=${status}`;
}
