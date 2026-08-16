import type { Metadata } from "next";

import { DASHBOARD_CHARTS } from "@/components/charts/chartCatalog";
import { PreviewView } from "@/components/preview/PreviewView";
import {
  buildPreviewStatFamilies,
  countPreviewMetrics,
} from "@/lib/preview/previewCatalog";

const TITLE = "Preview · Moonraker’s Analytics";
const DESCRIPTION =
  "Moonraker’s Analytics: every chart, every published metric, and the game entry screen — running on real tracked games. No account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/preview" },
  // The point of the page is that it can be handed to someone who has no
  // account, so the link has to unfurl into something worth opening.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/preview",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * Deliberately outside the `(dashboard)` route group: the layout there calls
 * `requireDashboardAccess`, and a preview that bounces a signed-out visitor to
 * the login form is not a preview.
 */
export default function PreviewPage() {
  const families = buildPreviewStatFamilies();

  return (
    <PreviewView
      chartCount={DASHBOARD_CHARTS.length}
      families={families}
      metricCount={countPreviewMetrics(families)}
    />
  );
}
