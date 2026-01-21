import { Label } from "@/components/ui/label";

export function FormField({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-white/70">{label}</Label>
      {children}
    </div>
  );
}
