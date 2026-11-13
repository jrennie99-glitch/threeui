import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { sampleRoute, ufoAt, pointerActive, dive } from "../dive";
import { quality } from "../quality";
import { Life } from "./Life";
import { Atlantis, Floors, GodRays, Sky, Ufo, Water } from "./Scenery";
import { sceneRefs, shared, updateFog } from "./shared";

class Boundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function Rig({ target }: { target: THREE.WebGLRenderTarget }) {
  const { camera, gl, scene } = useThree();
  const parallax = useRef({ x: 0, y: 0 });
  const buffer = useMemo(() => new THREE.Vector2(), []);
  const underClear = useMemo(() => new THREE.Color("#08343c"), []);

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta);
    const followDt = Math.min(1.2, delta);
    dive.dt = dt;
    dive.time += dt;
    shared.uTime.value = dive.time;
    const follow = 1 - Math.exp(-6.5 * followDt);
    dive.smooth += (dive.target - dive.smooth) * follow;
    const route = sampleRoute(dive.smooth);
    const alive = pointerActive();
    const px = alive ? dive.pointerX : Math.sin(dive.time * 0.17) * 0.12;
    const py = alive ? dive.pointerY : Math.sin(dive.time * 0.11) * 0.04;
    parallax.current.x += (px * 0.65 - parallax.current.x) * (1 - Math.exp(-3.2 * dt));
    parallax.current.y += (py * 0.22 - parallax.current.y) * (1 - Math.exp(-3.2 * dt));
    camera.position.set(
      route.pos[0] + parallax.current.x,
      route.pos[1] + Math.sin(dive.time * 0.55) * 0.045,
      route.pos[2],
    );
    camera.lookAt(
      route.look[0] + parallax.current.x * 0.28,
      route.look[1] + parallax.current.y * 0.2,
      route.look[2],
    );
    const y = camera.position.y;
    if ((dive.prevY > 0.25 && y <= 0.25) || (dive.prevY < -0.2 && y >= -0.2)) dive.splash = 1;
    dive.prevY = y;
    dive.cameraY = y;
    dive.splash = Math.max(0, dive.splash - dt * 0.8);
    shared.uUnder.value = y < 0.08 ? 1 : 0;
    updateFog(y);
    if (!scene.fog) scene.fog = new THREE.FogExp2(shared.uFogColor.value.getHex(), shared.uFogDensity.value);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.copy(shared.uFogColor.value);
    fog.density = shared.uFogDensity.value;
    scene.background = y > 0.35 && shared.hdr ? shared.hdr : shared.uFogColor.value;
    scene.environmentIntensity = y > 0.2 ? 1.2 : Math.max(0.62, Math.exp(y * 0.02));
    ufoAt(dive.time, dive.smooth, shared.uUfoPos.value);
    shared.uDetail.value = quality.detail;

    const water = sceneRefs.water;
    if (water) {
      const cell = quality.waterSize / quality.waterSeg;
      water.position.x = Math.floor(camera.position.x / cell) * cell;
      water.position.z = Math.floor(camera.position.z / cell) * cell;
    }

    gl.getDrawingBufferSize(buffer);
    shared.uResolution.value.copy(buffer);

    const canRefract = quality.refraction > 0 && y > 0.2 && sceneRefs.water && sceneRefs.sky;
    if (canRefract && sceneRefs.water && sceneRefs.sky) {
      const w = Math.max(2, Math.floor(buffer.x * quality.refraction));
      const h = Math.max(2, Math.floor(buffer.y * quality.refraction));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      sceneRefs.water.visible = false;
      sceneRefs.sky.visible = false;
      const previous = scene.background;
      scene.background = underClear;
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, camera);
      gl.setRenderTarget(null);
      scene.background = previous;
      sceneRefs.water.visible = true;
      sceneRefs.sky.visible = shared.hdr ? false : true;
      shared.uHasScene.value = 1;
      if (sceneRefs.waterMat) sceneRefs.waterMat.uniforms.uScene.value = target.texture;
    } else {
      shared.uHasScene.value = 0;
    }
  }, -10);

  return null;
}

function Compile({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancel = false;
    const run = async () => {
      try {
        const renderer = gl as THREE.WebGLRenderer & {
          compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<void>;
        };
        if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
        else gl.compile(scene, camera);
      } catch {
        /* The picture still draws if a warm-up compile fails. */
      }
      if (!cancel) onReady();
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [camera, gl, onReady, scene]);
  return null;
}

const chromaOffset = new THREE.Vector2(0.00065, 0.0004);

function SunsetField() {
  const { gl, scene } = useThree();
  useEffect(() => {
    let dead = false;
    let hdr: THREE.DataTexture | null = null;
    let env: THREE.Texture | null = null;
    const loader = new RGBELoader();
    loader.load("/hdri/sunset.hdr", (texture) => {
      if (dead) {
        texture.dispose();
        return;
      }
      hdr = texture;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      const pmrem = new THREE.PMREMGenerator(gl);
      env = pmrem.fromEquirectangular(texture).texture;
      pmrem.dispose();
      scene.environment = env;
      shared.hdr = texture;
      shared.uSky.value = texture;
      shared.uHasSky.value = 1;
      if (sceneRefs.sky) sceneRefs.sky.visible = false;
    });
    return () => {
      dead = true;
      hdr?.dispose();
      env?.dispose();
      scene.environment = null;
      shared.hdr = null;
      shared.uHasSky.value = 0;
    };
  }, [gl, scene]);
  return null;
}

function Grade() {
  const bloom = <Bloom intensity={0.42} luminanceThreshold={0.72} mipmapBlur luminanceSmoothing={0.18} />;
  const tail = (
    <>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.18} darkness={0.78} />
      <Noise opacity={0.16} premultiply />
    </>
  );
  if (!quality.dof) {
    return (
      <EffectComposer multisampling={0} enableNormalPass={false} depthBuffer>
        {bloom}
        {tail}
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false} depthBuffer>
      {bloom}
      <DepthOfField worldFocusDistance={18} worldFocusRange={28} bokehScale={0.35} resolutionScale={0.5} />
      <ChromaticAberration offset={chromaOffset} radialModulation={false} modulationOffset={0} />
      {tail}
    </EffectComposer>
  );
}

function World({ onReady }: { onReady: () => void }) {
  const target = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(8, 8, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
    });
    rt.texture.minFilter = THREE.LinearFilter;
    rt.texture.magFilter = THREE.LinearFilter;
    rt.texture.generateMipmaps = false;
    rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
    return rt;
  }, []);
  useEffect(() => () => target.dispose(), [target]);

  return (
    <>
      <Rig target={target} />
      <SunsetField />
      <Sky />
      <Water texture={target.texture} />
      <Floors />
      <GodRays />
      <Life />
      <Ufo />
      <Atlantis />
      <Compile onReady={onReady} />
      <Grade />
    </>
  );
}

export function OceanStage({ onReady, onFail }: { onReady: () => void; onFail: () => void }) {
  return (
    <div className="stage">
      <div className="stage-canvas" aria-hidden="true">
        <Boundary onError={onFail}>
          <Canvas
            dpr={quality.dpr}
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: "high-performance",
              stencil: false,
            }}
            camera={{ fov: quality.fov, near: 0.08, far: 360, position: [0, 6.4, 24] }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.setClearColor("#071018");
            }}
          >
            <World onReady={onReady} />
          </Canvas>
        </Boundary>
      </div>
    </div>
  );
}
