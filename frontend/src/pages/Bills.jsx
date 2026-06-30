import { EmptyState } from "../components/ui.jsx";

export default function Bills() {
  return (
    <EmptyState
      icon={"\u25B0"}
      title="Track your money in and out"
      body="Add your pay and recurring bills here. This is what powers your 'safe to spend' number. Coming online next."
    />
  );
}
