/*
 * DynamicUniverseRenderer – cinematic + instructive WebGL visualiser
 * ---------------------------------------------------------------
 *   fitness     -> global "order/chaos" (bloom + glitch)
 *   deltaC      -> brane‑warp amplitude + hue‑shift (cyan → red)
 *   deltaAlpha  -> particle energy (size + pulse)
 *   generation  -> expanding wire‑rings = spacetime horizon
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";

/* ------------------------------------------------------------------ */
export interface PhysicsParams {
  fitness: number; // combined fitness F
  deltaC: number; // relative error in c
  deltaAlpha: number; // relative error in α
  deltaG: number; // relative error in G (gravity)
  gModel: number; // calculated gravitational constant
  generation: number; // GA generation (for rings)
  coefficients: number[]; // raw coefficients for potential future use
}

/* ------------------------------------------------------------------ */
export class DynamicUniverseRenderer {
  // three basics
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private clock = new THREE.Clock();

  // world objects
  private brane!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private particles!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private particleVel!: Float32Array;
  private centralCore!: THREE.Mesh<
    THREE.IcosahedronGeometry,
    THREE.MeshStandardMaterial
  >;
  private rings: THREE.Line[] = [];

  // post FX
  private bloom!: UnrealBloomPass;
  private glitch!: GlitchPass;

  // options
  private autoRotate = true;
  private raf?: number;
  private particleCount!: number;
  private pixelRatio!: number;

  constructor(
    private canvas: HTMLCanvasElement,
    quality: "low" | "medium" | "high" = "medium",
  ) {
    this.configureQuality(quality);
    this.initRenderer();
    this.initCamera();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.scene.background = new THREE.Color(0x000010);

    this.createLights();
    this.createBrane();
    this.createParticles();
    this.createCentralCore();
    this.createComposer();

    this.animate();
  }

  /* ------------------------------------------------------------------ */
  /*                            INITIALISATION                           */
  /* ------------------------------------------------------------------ */
  private configureQuality(q: "low" | "medium" | "high") {
    const qFactor = { low: 0.5, medium: 1.0, high: 1.5 }[q];
    this.pixelRatio = Math.min(window.devicePixelRatio, 2) * qFactor;
    this.particleCount = q === "low" ? 8000 : q === "high" ? 40000 : 20000;
  }

  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      3000,
    );
    this.camera.position.set(0, 40, 160);
  }

  private createLights() {
    this.scene.add(new THREE.AmbientLight(0x888888));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(50, 120, 60);
    this.scene.add(dir);
  }

  /* ----------------------- world building --------------------------- */
  private createBrane() {
    const geo = new THREE.PlaneGeometry(220, 220, 220, 220);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        amplitude: { value: 0.0 },
        baseColor: { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: /* glsl */ `
        uniform float time; uniform float amplitude;
        varying float vStrength;
        void main(){
          vec3 p=position;
          float f=.035;
          p.z+=sin((p.x+time*8.)*f)*sin((p.y+time*8.)*f)*18.*amplitude;
          vStrength=1.-smoothstep(60.,130.,length(p.xy));
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 baseColor; varying float vStrength;
        void main(){ gl_FragColor=vec4(baseColor*vStrength,vStrength); }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.brane = new THREE.Mesh(geo, mat);
    this.brane.rotation.x = -Math.PI / 2;
    this.scene.add(this.brane);
  }

  private createParticles() {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(this.particleCount * 3);
    const col = new Float32Array(this.particleCount * 3);
    const vel = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const r = 30 + Math.random() * 160;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi);

      col[i3] = 0.2;
      col[i3 + 1] = 0.8;
      col[i3 + 2] = 1.0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.particleVel = vel;

    const mat = new THREE.PointsMaterial({
      size: 0.9,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  private createCentralCore() {
    const geo = new THREE.IcosahedronGeometry(6, 4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x000000,
      roughness: 0.25,
      metalness: 0.95,
    });
    this.centralCore = new THREE.Mesh(geo, mat);
    this.centralCore.visible = false;
    this.scene.add(this.centralCore);
  }

  private createComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.3,
      0.4,
      0.1,
    );
    this.composer.addPass(this.bloom);

    this.glitch = new GlitchPass();
    this.glitch.goWild = false;
    this.composer.addPass(this.glitch);
  }

  /* ------------------------------------------------------------------ */
  /*                             PHYSICS INPUT                           */
  /* ------------------------------------------------------------------ */
  updatePhysics(p: PhysicsParams) {
    const chaos = THREE.MathUtils.clamp(
      Math.log10(p.fitness + 1e-12) / -6,
      0,
      1,
    ); // 0=perfect,1=chaos
    const warp = THREE.MathUtils.clamp(Math.log10(p.deltaC + 1e-12) / -6, 0, 1);
    const energy = THREE.MathUtils.clamp(
      Math.log10(p.deltaAlpha + 1e-12) / -6,
      0,
      1,
    );
    const gravity = THREE.MathUtils.clamp(Math.log10(p.deltaG + 1e-12) / -6, 0, 1);

    // brane amplitude & hue
    gsap.to((this.brane.material as THREE.ShaderMaterial).uniforms.amplitude, {
      value: warp,
      duration: 1.2,
    });
    const hue = 0.55 - warp * 0.55; // cyan -> red
    const col = new THREE.Color().setHSL(hue, 1, 0.6);
    gsap.to(
      (this.brane.material as THREE.ShaderMaterial).uniforms.baseColor.value,
      { r: col.r, g: col.g, b: col.b, duration: 1.2 },
    );

    // particle size (influenced by alpha and gravity)
    (this.particles.material as THREE.PointsMaterial).size = 0.6 + energy * 2.0 + gravity * 1.5;

    // core grow (gravity affects core intensity)
    const scale = THREE.MathUtils.lerp(0.1, 1.3, 1 - chaos);
    const gravityScale = THREE.MathUtils.lerp(0.8, 1.4, 1 - gravity);
    this.centralCore.visible = scale > 0.25;
    gsap.to(this.centralCore.scale, {
      x: scale * gravityScale,
      y: scale * gravityScale,
      z: scale * gravityScale,
      duration: 1.2,
    });
    
    // gravity influences core color (purple for strong gravity)
    const gravityColor = new THREE.Color().setHSL(0.8 - gravity * 0.3, 0.8, 0.5);
    gsap.to(
      (this.centralCore.material as THREE.MeshStandardMaterial).emissive,
      {
        r: (1 - chaos) * gravityColor.r,
        g: (1 - chaos) * gravityColor.g,
        b: (1 - chaos) * gravityColor.b,
        duration: 1.2,
      },
    );

    // post FX (gravity affects bloom intensity)
    this.glitch.goWild = chaos > 0.6;
    const bloomStrength = 0.3 + (1 - chaos) * 1.7 + (1 - gravity) * 0.5;
    gsap.to(this.bloom, { strength: bloomStrength, duration: 1.2 });

    // generation rings -------------------------------------------------
    this.updateGenerationRings(p.generation);
    
    // gravity field visualization
    this.updateGravityField(gravity, p.gModel);
  }

  /* ------------------------------------------------------------------ */
  private updateGenerationRings(gen: number) {
    // keep max 15 rings, each 10 generations apart
    const wanted = Math.floor(gen / 10);
    while (this.rings.length < wanted && this.rings.length < 15) {
      const idx = this.rings.length;
      const radius = 30 + idx * 8;
      const geo = new THREE.RingGeometry(radius - 0.4, radius, 128);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      this.scene.add(ring);
      this.rings.push(ring as any);
      // fade‑in anim
      gsap.to(mat, { opacity: 0.15, duration: 1.5, delay: 0.1 * idx });
    }
  }

  /* ------------------------------------------------------------------ */
  private updateGravityField(gravity: number, gModel: number) {
    // Gravity field visualization: modify particle motion based on gravity strength
    // Strong gravity (low deltaG) creates more organized motion patterns
    const gravityStrength = 1 - gravity; // invert so strong gravity = high value
    
    // Update particle velocities to show gravitational effects
    const pos = this.particles.geometry.attributes.position.array as Float32Array;
    const vel = this.particleVel;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = pos[i3];
      const y = pos[i3 + 1];
      const z = pos[i3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z);
      
      // Apply gravitational attraction toward center
      if (dist > 0.1) {
        const gravityForce = gravityStrength * 0.001 / (dist * dist);
        vel[i3] += (-x / dist) * gravityForce;
        vel[i3 + 1] += (-y / dist) * gravityForce;
        vel[i3 + 2] += (-z / dist) * gravityForce;
      }
    }
    
    // Update ring colors to reflect gravity strength
    this.rings.forEach((ring, idx) => {
      if (ring && ring.material) {
        const material = ring.material as THREE.MeshBasicMaterial;
        const hue = 0.55 + gravityStrength * 0.25; // cyan to purple for strong gravity
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        gsap.to(material.color, {
          r: color.r,
          g: color.g,
          b: color.b,
          duration: 2.0,
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*                               LOOP                                  */
  /* ------------------------------------------------------------------ */
  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    if (this.autoRotate) this.scene.rotation.y += dt * 0.06;
    this.controls.update();

    (this.brane.material as THREE.ShaderMaterial).uniforms.time.value = t;
    this.centralCore.rotation.y = t * 0.2;

    this.updateParticles(t);

    this.composer.render();
  };

  private updateParticles(time: number) {
    const pos = this.particles.geometry.attributes.position
      .array as Float32Array;
    const col = this.particles.geometry.attributes.color.array as Float32Array;
    const vel = this.particleVel;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      // swirl velocities
      const vx = vel[i3] + -pos[i3 + 2] * 0.00035;
      const vy = vel[i3 + 1] + (Math.random() - 0.5) * 0.0025;
      const vz = vel[i3 + 2] + pos[i3] * 0.00035;
      vel[i3] = vx * 0.96;
      vel[i3 + 1] = vy * 0.96;
      vel[i3 + 2] = vz * 0.96;
      pos[i3] += vel[i3];
      pos[i3 + 1] += vel[i3 + 1];
      pos[i3 + 2] += vel[i3 + 2];

      // color pulsate (cyan‑purple cycle)
      const hue = 0.55 + Math.sin(time + i * 0.015) * 0.06;
      const temp = new THREE.Color().setHSL(hue, 1, 0.55);
      col[i3] = temp.r;
      col[i3 + 1] = temp.g;
      col[i3 + 2] = temp.b;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /*                            PUBLIC CONTROLS                           */
  /* ------------------------------------------------------------------ */
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
  }
  toggleBraneVisibility() {
    this.brane.visible = !this.brane.visible;
  }
  resetCamera() {
    this.camera.position.set(0, 40, 160);
    this.controls.target.set(0, 0, 0);
  }
  setQuality(q: "low" | "medium" | "high") {
    // dispose & recreate quickly
    cancelAnimationFrame(this.raf!);
    this.renderer.dispose();
    this.scene.clear();
    this.rings = [];
    this.configureQuality(q);
    this.initRenderer();
    this.initCamera();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.createLights();
    this.createBrane();
    this.createParticles();
    this.createCentralCore();
    this.createComposer();
    this.animate();
  }
  resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
  dispose() {
    cancelAnimationFrame(this.raf!);
    this.renderer.dispose();
  }
}
