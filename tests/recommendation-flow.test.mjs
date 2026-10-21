import test from "node:test";
import assert from "node:assert/strict";
import { recommendationPresentation, recommendationBackStage, savedRecommendationShelf } from "../src/lib/recommendation-flow.js";

test("Explore opens its own expanded evidence while preserving the selected book", () => {
  const explore = recommendationPresentation("Good match");
  assert.equal(explore.heroLabel, "Vela recommendation");
  assert.equal(explore.expandExplanation, true);
  assert.equal(explore.keepExplanationBook, true);
  assert.equal(recommendationPresentation("Strong match").expandExplanation, false);
  assert.equal(recommendationPresentation("Experimental").expandExplanation, true);
});

test("prototype return paths distinguish results, experimental detail and signal correction origins", () => {
  for (const confidence of ["Strong match", "Good match"]) {
    for (const stage of ["detail", "why", "saved", "assumptions", "show-less", "recorded"]) {
      assert.equal(recommendationBackStage(stage, confidence), "results");
    }
  }
  assert.equal(recommendationBackStage("why", "Experimental"), "detail");
  assert.equal(recommendationBackStage("saved", "Experimental"), "detail");
  assert.equal(recommendationBackStage("correction", "Good match", "why"), "why");
  assert.equal(recommendationBackStage("correction", "Good match"), "assumptions");
  assert.equal(recommendationBackStage("book", "Good match"), "detail");
});

test("saved recommendations open the actual shelf, including restored reading history", () => {
  assert.equal(savedRecommendationShelf({status:"want_to_read"}), "/library?tab=want_to_read");
  for (const status of ["reading", "finished", "dnf"]) {
    assert.equal(savedRecommendationShelf({status}), `/library?tab=${status}`);
  }
  assert.equal(savedRecommendationShelf(null), "/library?tab=want_to_read");
  assert.equal(savedRecommendationShelf({status:"other"}), "/library?tab=want_to_read");
});
