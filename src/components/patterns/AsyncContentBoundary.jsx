import EmptyState from "@/components/states/EmptyState";
import ErrorRecoveryState from "@/components/states/ErrorRecoveryState";
import LoadingState from "@/components/states/LoadingState";

export default function AsyncContentBoundary({
  loading, offline, error, empty, loadingVariant="book-list", emptyProps, onRetry, children
}) {
  if(loading)return <LoadingState variant={loadingVariant}/>;
  if(offline)return <ErrorRecoveryState type="offline" onRetry={onRetry} secondaryLabel="Open Library" secondaryHref="/library"/>;
  if(error)return <ErrorRecoveryState type="error" onRetry={onRetry}/>;
  if(empty)return <EmptyState {...emptyProps}/>;
  return children;
}
