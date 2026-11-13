import { useEffect, useState } from "react";
import { beats, dive } from "./dive";
import { OceanStage } from "./scene/OceanCanvas";
import { Interface } from "./ui/Interface";
import { Loader } from "./ui/Loader";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function App() {
  const [reduced, setReduced] = useState(false);
  const [glOk, setGlOk] = useState(true);
  const [override, setOverride] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const forceStill = params?.has("still") ?? false;
  const forceDive = params?.has("dive") ?? false;
  const diveOn = glOk && !failed && !forceStill && (!reduced || override || forceDive);

  useEffect(() => {
    setGlOk(hasWebGL());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    dive.debug = new URLSearchParams(window.location.search).has("debug");

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      dive.target = max > 0 ? window.scrollY / max : 0;
    };
    const onPointer = (event: PointerEvent) => {
      dive.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      dive.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
      dive.pointerAt = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    const jump = () => {
      const at = new URLSearchParams(window.location.search).get("at");
      if (!at) return;
      const named = beats[at];
      const value = named ?? Number(at);
      if (!Number.isFinite(value)) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = Math.min(1, Math.max(0, value));
      window.scrollTo({ top: max * next, behavior: "instant" });
      dive.target = next;
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(jump));
    onScroll();
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div className="page" data-mode={diveOn ? "dive" : "still"}>
      <a className="skip" href="#content">
        Skip to content
      </a>
      {diveOn ? (
        <>
          <OceanStage onReady={() => setReady(true)} onFail={() => setFailed(true)} />
          <Loader ready={ready} />
        </>
      ) : null}
      <Interface still={!diveOn} canEnter={glOk && reduced && !failed && !diveOn} onEnter={() => setOverride(true)} />
    </div>
  );
}
