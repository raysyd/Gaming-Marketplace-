/** Kept in step with the check constraint on reports.reason (supabase/25-launch-hardening.sql). */
export const REPORT_REASONS = [
  { value: "scam", label: "Looks like a scam" },
  { value: "off_platform_payment", label: "Asked me to pay outside Sidegrade" },
  { value: "counterfeit", label: "Fake or counterfeit" },
  { value: "misleading", label: "Misleading description or photos" },
  { value: "prohibited", label: "Not allowed on Sidegrade" },
  { value: "harassment", label: "Abusive or harassing" },
  { value: "other", label: "Something else" },
] as const;
