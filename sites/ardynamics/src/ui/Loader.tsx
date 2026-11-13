import { useEffect, useState } from "react";

export function Loader({ ready }: { ready: boolean }) {
  const [progress, setProgress] = useState(8);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (ready) {
      setProgress(100);
      const hide = window.setTimeout(() => setGone(true), 700);
      return () => window.clearTimeout(hide);
    }
    const id = window.setInterval(() => {
      setProgress((value) => Math.min(90, value + Math.max(0.7, (90 - value) * 0.07)));
    }, 90);
    return () => window.clearInterval(id);
  }, [ready]);

  if (gone) return null;

  return (
    <div className={`loader${ready ? " is-done" : ""}`} role="status" aria-live="polite">
      <p className="loader-mark">
        <span>AR</span> Dynamics
      </p>
      <p className="loader-note">Preparing the water</p>
      <div className="loader-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="loader-pct">{Math.round(progress)}%</p>
    </div>
  );
}
