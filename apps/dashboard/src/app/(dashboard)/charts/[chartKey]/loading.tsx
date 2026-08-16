import { DashboardPanel } from "@/components/ui/DashboardPanel";

export default function ChartDetailLoading() {
  return (
    <section className="view-stack" aria-busy="true">
      <DashboardPanel padding="normal">
        <p aria-live="polite" className="stat__label" role="status">
          Loading chart for the selected player...
        </p>
      </DashboardPanel>
    </section>
  );
}
