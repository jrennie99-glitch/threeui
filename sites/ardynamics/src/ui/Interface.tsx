import { useEffect, useState } from "react";
import { ambientWanted, setAmbient } from "../audio";
import { dive, zoneLabel } from "../dive";

const mailto =
  "mailto:hello@ardynamicsinc.com?subject=Build%20with%20AR%20Dynamics&body=Hello%20AR%20Dynamics%2C%0A%0AWe%20want%20to%20build%3A%0A";

export function Interface({
  still,
  canEnter,
  onEnter,
}: {
  still: boolean;
  canEnter: boolean;
  onEnter: () => void;
}) {
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const meter = document.getElementById("depth-readout");
    const breach = document.getElementById("breach");
    const hint = document.getElementById("scroll-hint");
    const debug = document.getElementById("dive-debug");
    let frame = 0;
    const tick = () => {
      const meters = Math.max(0, -dive.cameraY);
      const zone = zoneLabel(dive.smooth, dive.cameraY);
      if (meter) {
        meter.textContent = still ? "Still water" : meters < 0.4 ? "Surface" : `${meters.toFixed(0)} m · ${zone}`;
      }
      if (breach) breach.style.opacity = String(Math.min(0.55, dive.splash * 0.45));
      if (hint) hint.style.opacity = dive.smooth > 0.04 ? "0" : "1";
      if (debug) debug.textContent = `${dive.smooth.toFixed(3)}  y ${dive.cameraY.toFixed(1)}`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still]);

  function toggleSound(): void {
    const next = !ambientWanted();
    setAmbient(next);
    setSound(next);
  }

  return (
    <>
      <header className="nav">
        <a className="wordmark" href="#top">
          <span>AR</span> Dynamics
        </a>
        <nav aria-label="Page">
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#process">Process</a>
          <a href="#contact">Contact</a>
          <button type="button" className={sound ? "is-on" : ""} aria-pressed={sound} onClick={toggleSound}>
            {sound ? "Sound on" : "Sound off"}
          </button>
        </nav>
      </header>

      <p id="depth-readout" className="depth" aria-hidden="true">
        Surface
      </p>
      <div id="breach" className="breach" aria-hidden="true" />
      {dive.debug ? <p id="dive-debug" className="debug" /> : null}

      <main id="content">
        <section className="band hero" id="top" aria-labelledby="hero-title">
          {still ? <HeroArt /> : null}
          <div className="card-wrap">
            <article className="card">
              <p className="eyebrow">AR Dynamics Inc · Honolulu</p>
              <h1 id="hero-title">
                We build worlds, <em>not websites.</em>
              </h1>
              <p className="lede">
                AI software, web apps, mobile apps, and Chrome extensions. Designed in Honolulu and built to feel alive.
              </p>
              <div className="actions">
                <a className="btn" href={mailto}>
                  Start a project
                </a>
                <a className="btn ghost" href="#work">
                  See the work
                </a>
              </div>
              {still ? (
                <p className="note">
                  {canEnter
                    ? "Motion is off because this device asked for reduced motion."
                    : "This is the still version. WebGL is not available in this browser."}
                </p>
              ) : null}
              {canEnter ? (
                <button type="button" className="btn ghost enter" onClick={onEnter}>
                  Enter the dive
                </button>
              ) : null}
            </article>
          </div>
          <p id="scroll-hint" className="hint">
            Scroll to dive
          </p>
        </section>

        <section className="band center" id="services" aria-labelledby="services-title">
          {still ? <ReefArt /> : null}
          <div className="card-wrap">
            <article className="card">
              <p className="eyebrow">01 — Services</p>
              <h2 id="services-title">The work is the medium.</h2>
              <p>If it does not move, it is not finished. We design the thing people send to a friend.</p>
              <ol className="list">
                <li>
                  <strong>Immersive 3D websites</strong>
                  <span>Scroll-driven WebGL, built as one continuous place.</span>
                </li>
                <li>
                  <strong>Web applications</strong>
                  <span>Product interfaces with the same care as the surface.</span>
                </li>
                <li>
                  <strong>AI products</strong>
                  <span>Software with a model in the loop, shaped for a real task.</span>
                </li>
                <li>
                  <strong>Mobile apps</strong>
                  <span>Products that feel at home on a phone.</span>
                </li>
                <li>
                  <strong>Chrome extensions</strong>
                  <span>Small tools that live where the work already happens.</span>
                </li>
              </ol>
            </article>
          </div>
        </section>

        <section className="band center right" id="work" aria-labelledby="work-title">
          {still ? <BlueArt /> : null}
          <div className="card-wrap">
            <article className="card">
              <p className="eyebrow">02 — Work</p>
              <h2 id="work-title">Products from the studio.</h2>
              <ul className="work">
                <li>
                  <div>
                    <h3>SOHK</h3>
                    <p>A study app.</p>
                  </div>
                  <a href="https://sohkstudy.com" target="_blank" rel="noreferrer">
                    sohkstudy.com
                  </a>
                </li>
                <li>
                  <div>
                    <h3>Concierge OS</h3>
                    <p>Hotel concierge AI.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>Appl1ance</h3>
                    <p>A product by AR Dynamics.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>Cybrmail</h3>
                    <p>Part of Cybrnetic.</p>
                  </div>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className="band" id="process" aria-labelledby="process-title">
          {still ? <CraftArt /> : null}
          <div className="card-wrap">
            <article className="card">
              <p className="eyebrow">03 — Process</p>
              <h2 id="process-title">Four moves, then it ships.</h2>
              <ol className="steps">
                <li>
                  <span>01</span>
                  <strong>Listen</strong>
                  <p>The product, the audience, the thing it has to do.</p>
                </li>
                <li>
                  <span>02</span>
                  <strong>Shape</strong>
                  <p>Motion, structure, and the first thing a visitor feels.</p>
                </li>
                <li>
                  <span>03</span>
                  <strong>Build</strong>
                  <p>Engineering you can open in a browser.</p>
                </li>
                <li>
                  <span>04</span>
                  <strong>Launch</strong>
                  <p>Ship it, watch it, keep it alive.</p>
                </li>
              </ol>
            </article>
          </div>
        </section>

        <section className="band contact" id="contact" aria-labelledby="contact-title">
          {still ? <CityArt /> : null}
          <div className="card-wrap">
            <article className="card">
              <p className="eyebrow">04 — Build with us</p>
              <h2 id="contact-title">Tell us what you want built.</h2>
              <p>
                <a className="mail" href={mailto}>
                  hello@ardynamicsinc.com
                </a>
              </p>
              <p className="who">Anthony Reynolds, Founder &amp; CEO</p>
              <a className="btn" href={mailto}>
                Write to us
              </a>
            </article>
          </div>
          <footer className="colophon">
            <p>
              AR Dynamics Inc
              <br />
              200 N Vineyard Blvd, Ste A325 #5128
              <br />
              Honolulu, HI 96817
            </p>
            <p>
              <a href={mailto}>hello@ardynamicsinc.com</a>
            </p>
            <p className="fine">
              Type is Instrument Serif, Newsreader, and Fragment Mono, under the SIL Open Font License 1.1. The ocean is
              procedural. No stock creatures.
            </p>
          </footer>
        </section>
      </main>
    </>
  );
}

function HeroArt() {
  return (
    <svg className="art" viewBox="0 0 1200 800" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4e89" />
          <stop offset="0.55" stopColor="#f3a15a" />
          <stop offset="1" stopColor="#0b3a44" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sky)" />
      <circle cx="860" cy="250" r="54" fill="#ffe1ad" />
      <path d="M0 470c160-40 240-40 400 0s240 40 400 0 240-40 400 0v330H0z" fill="#0c4a52" />
      <path d="M0 520c180-30 260-30 420 0s250 30 400 0 220-28 380 0v280H0z" fill="#08343c" />
    </svg>
  );
}

function ReefArt() {
  return (
    <svg className="art" viewBox="0 0 1200 800" aria-hidden="true">
      <rect width="1200" height="800" fill="#07343c" />
      <path d="M80 800c20-180 40-220 30-360" stroke="#1f6b45" strokeWidth="14" fill="none" />
      <path d="M140 800c10-140 50-200 20-320" stroke="#2f8f55" strokeWidth="10" fill="none" />
      <ellipse cx="420" cy="560" rx="90" ry="40" fill="#e07a5f" />
      <ellipse cx="520" cy="600" rx="50" ry="28" fill="#9b5de5" />
      <ellipse cx="300" cy="420" rx="28" ry="10" fill="#ffd166" transform="rotate(-12 300 420)" />
      <ellipse cx="360" cy="390" rx="18" ry="7" fill="#4cc9f0" />
    </svg>
  );
}

function BlueArt() {
  return (
    <svg className="art" viewBox="0 0 1200 800" aria-hidden="true">
      <rect width="1200" height="800" fill="#042028" />
      <path d="M120 470c80-20 140-10 180 20 30 24 70 30 120 8 40-18 80-10 140 16" stroke="#8aa0aa" strokeWidth="16" fill="none" />
      <ellipse cx="820" cy="300" rx="26" ry="40" fill="#7cf0ff" opacity="0.7" />
      <ellipse cx="900" cy="360" rx="16" ry="28" fill="#d9a6ff" opacity="0.7" />
    </svg>
  );
}

function CraftArt() {
  return (
    <svg className="art" viewBox="0 0 1200 800" aria-hidden="true">
      <rect width="1200" height="800" fill="#03141c" />
      <ellipse cx="600" cy="360" rx="120" ry="28" fill="#101820" stroke="#7ee7ff" />
      <path d="M600 380 L560 620 L640 620 Z" fill="#7ee7ff" opacity="0.35" />
      <circle cx="600" cy="340" r="22" fill="#12323a" stroke="#b8f3ff" />
    </svg>
  );
}

function CityArt() {
  return (
    <svg className="art" viewBox="0 0 1200 800" aria-hidden="true">
      <rect width="1200" height="800" fill="#041820" />
      <ellipse cx="600" cy="560" rx="280" ry="40" fill="#0c2c36" />
      <path d="M480 560a120 90 0 0 1 240 0" fill="#123f4a" stroke="#7ee7ff" />
      <path d="M360 560a70 50 0 0 1 140 0" fill="#163844" stroke="#ffd39a" />
      <path d="M700 560a80 56 0 0 1 150 0" fill="#163844" stroke="#7ee7ff" />
    </svg>
  );
}
