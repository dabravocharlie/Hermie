import { EmptyState } from "../components/ui.jsx";

export default function Calendar() {
  return (
    <EmptyState
      icon={"\u25A3"}
      title="Reminders that matter"
      body="IPO dates, bill due dates, and appointments in one place, with a countdown to each."
    />
  );
}
