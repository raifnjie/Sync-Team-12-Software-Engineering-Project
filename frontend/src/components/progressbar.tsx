type ProgressBarProps = {
  /* Finished part, as a percent from 0 to 100 */
  value: number;
  /* Optional lighter segment after it for work in progress, also a percent */
  inProgressValue?: number;
  label: string;
  /* Spoken instead of "83" by screen readers, e.g. "30 of 36 credits" */
  valueText?: string;
  tone?: "brand" | "green";
  className?: string;
};

/* One progress bar for the whole app (dashboard, timeline, progress page) */
export default function ProgressBar({
  value,
  inProgressValue = 0,
  label,
  valueText,
  tone = "brand",
  className = "",
}: ProgressBarProps) {
  const done = Math.max(0, Math.min(100, value));
  const extra = Math.max(0, Math.min(100 - done, inProgressValue));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
      className={`flex h-1.5 overflow-hidden rounded-sm bg-gray-200 ${className}`}
    >
      <div
        className={`h-full transition-[width] duration-500 ${tone === "green" ? "bg-green-600" : "bg-brand"}`}
        style={{ width: `${done}%` }}
      />
      {extra > 0 && <div className="h-full bg-brand/40" style={{ width: `${extra}%` }} />}
    </div>
  );
}
