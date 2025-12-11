
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function PerformanceChartPlaceholder() {
  return (
    <div className="h-[350px] w-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30 p-6">
      <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
      <p className="text-lg font-semibold text-foreground">Performance Chart</p>
      <p className="text-sm text-muted-foreground text-center">
        Your monthly leads and email engagement trends will be displayed here.
      </p>
      <p className="text-xs text-muted-foreground mt-2">(Chart component to be integrated)</p>
    </div>
  );
}
