import PersonalisationOffState from "@/components/states/PersonalisationOffState";

export default function PersonalisationBoundary({ enabled, children, compact=false }) {
  if(!enabled)return <PersonalisationOffState compact={compact}/>;
  return children;
}
