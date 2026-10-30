// 3D 미니어처 가게(Three.js). 모형은 Kenney(CC0). React와 떨어진 순수 엔진이고 화면 컴포넌트가 감싼다.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AnimEvents } from '../../sim/tick';
import {
  CHARACTERS, COUNTER_FRONT, ENTRY_PATH, PIZZA_SLOTS, ROOM, SEATS, STAFF, STATIC_PROPS, TABLE_GROUPS, VAN, modelPath, type Prop,
} from './layout';

const DEG = Math.PI / 180;
const WALK_SPEED = 1.5; // 칸/초
const MAX_PIZZAS = 5;

// 같은 모형을 여러 번 띄워도 한 번만 받는다(화면이 다시 그려져도 재사용).
const gltfCache = new Map<string, Promise<GLTF>>();
function loadModel(base: string, name: string): Promise<GLTF> {
  const url = base + modelPath(name);
  let p = gltfCache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url);
    gltfCache.set(url, p);
  }
  return p;
}

function enableShadows(obj: THREE.Object3D, cast = true) {
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = cast;
      o.receiveShadow = true;
    }
  });
}

/** 모형의 바닥 중심을 (x, z)에, 바닥 높이를 y에 맞춰 놓는다(모형마다 원점이 달라서). */
function place(obj: THREE.Object3D, p: Prop) {
  obj.scale.setScalar(p.scale ?? 1);
  obj.rotation.y = (p.rotY ?? 0) * DEG;
  obj.position.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(p.x - c.x, (p.y ?? 0) - box.min.y, p.z - c.z);
}

type Waypoint = { x: number; z: number };

interface Walker {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  current: string;
  busy: boolean;
  path: Waypoint[];
  wait: number;
  phase: 'in' | 'counter' | 'toSeat' | 'sit' | 'out' | 'idle';
  seat: number;
}

function playAction(w: Walker, name: string) {
  if (w.current === name) return;
  const next = w.actions.get(name) ?? w.actions.get('idle');
  const prev = w.actions.get(w.current);
  if (!next) return;
  next.reset().fadeIn(0.2).play();
  prev?.fadeOut(0.2);
  w.current = name;
}

function makeWalker(gltf: GLTF): Walker {
  const root = cloneSkinned(gltf.scene);
  enableShadows(root);
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
  const w: Walker = { root, mixer, actions, current: '', busy: false, path: [], wait: 0, phase: 'idle', seat: -1 };
  playAction(w, 'idle');
  return w;
}

export class ShopEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;
  private sun = new THREE.DirectionalLight(0xffffff, 1.6);
  private sky = new THREE.HemisphereLight(0xfff4e0, 0x9c7a55, 1.1);
  private lamps: THREE.PointLight[] = [];
  private customers: Walker[] = [];
  private staff: Walker[] = [];
  private tableGroups: THREE.Group[] = [];
  private tableLimit = TABLE_GROUPS.length;
  private staffLimit = STAFF.length;
  private pizzas: { obj: THREE.Object3D; t: number; slot: number }[] = [];
  private van: THREE.Object3D | null = null;
  private vanTrip: { phase: 'leave' | 'return'; t: number } | null = null;
  private seatsTaken = new Set<number>();
  private staffBusy = 0;
  private ready = false;
  private disposed = false;

  constructor(private container: HTMLElement, private base: string, private still: boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    const target = new THREE.Vector3(4.6, 0.3, 3.0);
    this.camera.position.copy(target).add(new THREE.Vector3(7, 8.5, 10));
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(target);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = 0.55;
    this.controls.maxPolarAngle = 1.15;
    this.controls.minAzimuthAngle = -0.15;
    this.controls.maxAzimuthAngle = 1.45;
    this.controls.minZoom = 0.8;
    this.controls.maxZoom = 2.4;
    this.controls.update();

    this.scene.add(this.sky);
    this.sun.position.set(9, 12, 9);
    this.sun.target.position.copy(target);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
    this.scene.add(this.sun, this.sun.target);
    for (const [x, z] of [[4.6, 3.3], [6.6, 3.3], [1.6, 1.4]]) {
      const lamp = new THREE.PointLight(0xffc27a, 0, 4.5, 1.6);
      lamp.position.set(x, 1.2, z);
      this.lamps.push(lamp);
      this.scene.add(lamp);
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    if (import.meta.env.DEV) (window as unknown as { __shop?: ShopEngine }).__shop = this;
  }

  /** 개발용: 정해진 크기로 한 장 그려 이미지 주소로 돌려준다(장면 점검용). */
  snapshot(width: number, height: number): string {
    const prev = new THREE.Vector2();
    this.renderer.getSize(prev);
    this.renderer.setSize(width, height, false);
    const save = [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom];
    const halfH = 2.7;
    const halfW = Math.max(halfH * (width / height), 5.2);
    const k = halfW / (halfH * (width / height));
    Object.assign(this.camera, { left: -halfW, right: halfW, top: halfH * k, bottom: -halfH * k });
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/jpeg', 0.85);
    [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom] = save;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(prev.x, prev.y, false);
    return url;
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const view = 5.4; // 화면 세로에 들어갈 칸 수
    const aspect = w / h;
    const halfH = view / 2;
    const halfW = Math.max(halfH * aspect, 5.2); // 세로 화면에서도 가게 폭이 다 보이게
    const k = halfW / (halfH * aspect);
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH * k;
    this.camera.bottom = -halfH * k;
    this.camera.updateProjectionMatrix();
  }

  async load(): Promise<void> {
    const names = new Set<string>([
      'furniture/floorFull', ...STATIC_PROPS.map((p) => p.model), ...TABLE_GROUPS.flat().map((p) => p.model), ...CHARACTERS, ...STAFF.map((s) => s.model),
      'food/pizza', 'car/delivery',
    ]);
    const loaded = new Map<string, GLTF>();
    await Promise.all([...names].map(async (n) => loaded.set(n, await loadModel(this.base, n))));
    if (this.disposed) return;

    // 바닥 타일과 바깥 길
    const tile = loaded.get('furniture/floorFull')!.scene;
    for (let i = 0; i < ROOM.width; i++) {
      for (let j = 0; j < ROOM.depth; j++) {
        const t = tile.clone();
        place(t, { model: '', x: i + 0.5, z: j + 0.5, y: -0.05 }); // 타일 윗면이 바닥 높이 0
        t.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.receiveShadow = true; });
        this.scene.add(t);
      }
    }
    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM.street + 6, ROOM.depth + 14),
      new THREE.MeshStandardMaterial({ color: 0x8d8a86, roughness: 1 }),
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(ROOM.width + (ROOM.street + 6) / 2, -0.01, ROOM.depth / 2);
    street.receiveShadow = true;
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.06, ROOM.depth + 14),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c8 }),
    );
    curb.position.set(ROOM.width + 0.12, 0.03, ROOM.depth / 2);
    this.scene.add(street, curb);

    for (const p of STATIC_PROPS) {
      const obj = loaded.get(p.model)!.scene.clone();
      place(obj, p);
      enableShadows(obj, !p.model.includes('rug'));
      this.scene.add(obj);
    }

    for (const group of TABLE_GROUPS) {
      const g = new THREE.Group();
      for (const p of group) {
        const obj = loaded.get(p.model)!.scene.clone();
        place(obj, p);
        enableShadows(obj);
        g.add(obj);
      }
      this.scene.add(g);
      this.tableGroups.push(g);
    }
    this.applyTables();

    for (const s of STAFF) {
      const w = makeWalker(loaded.get(s.model)!);
      place(w.root, { model: '', x: s.x, z: s.z });
      w.root.rotation.y = 0;
      this.scene.add(w.root);
      this.staff.push(w);
    }
    this.setStaff(this.staffLimit);

    for (const name of CHARACTERS) {
      const w = makeWalker(loaded.get(name)!);
      w.root.visible = false;
      this.scene.add(w.root);
      this.customers.push(w);
    }

    const pizza = loaded.get('food/pizza')!.scene;
    for (let i = 0; i < MAX_PIZZAS; i++) {
      const obj = pizza.clone();
      enableShadows(obj);
      place(obj, { model: '', ...PIZZA_SLOTS[i], scale: 0.3 });
      obj.visible = false;
      this.scene.add(obj);
      this.pizzas.push({ obj, t: -1, slot: i });
    }

    this.van = loaded.get('car/delivery')!.scene.clone();
    enableShadows(this.van);
    place(this.van, { model: '', x: VAN.x, z: VAN.z, rotY: VAN.rotY, scale: VAN.scale });
    this.scene.add(this.van);

    this.ready = true;
  }

  /** 식탁 업그레이드 단계만큼 식탁을 보인다. */
  setTables(n: number) {
    this.tableLimit = Math.max(1, Math.min(TABLE_GROUPS.length, n));
    this.applyTables();
  }

  private applyTables() {
    this.tableGroups.forEach((g, i) => { g.visible = i < this.tableLimit; });
  }

  /** 카운터 뒤에 보일 사람 수(사장님 + 근무 중 알바, 최대 3) */
  setStaff(n: number) {
    this.staffLimit = Math.max(1, Math.min(STAFF.length, n));
    this.staff.forEach((w, i) => { w.root.visible = i < this.staffLimit; });
  }

  /** 시간대별 빛: 낮은 밝게, 저녁은 노을빛, 밤은 파랗게 어둡고 가게 조명이 켜진다. */
  setHour(hour: number) {
    const night = hour >= 19;
    const evening = hour >= 17 && !night;
    this.sun.color.set(night ? 0x7b8fdc : evening ? 0xffb06a : 0xfff2dc);
    this.sun.intensity = night ? 0.35 : evening ? 1.2 : 1.7;
    this.sky.intensity = night ? 0.45 : evening ? 0.9 : 1.15;
    for (const l of this.lamps) l.intensity = night ? 2.2 : evening ? 0.8 : 0;
  }

  /** 한 시간 영업의 결과를 장면으로 보여 준다. */
  play(anim: AnimEvents) {
    if (!this.ready) return;
    for (let i = 0; i < Math.min(anim.hallArrivals, 3); i++) this.spawnCustomer(i * 0.35);
    for (let i = 0; i < Math.min(anim.pizzasBaked, MAX_PIZZAS); i++) this.bakePizza(i * 0.12);
    if (anim.pizzasBaked > 0) this.staffBusy = 2.2;
    if (anim.deliveriesOut > 0 && !this.vanTrip) this.vanTrip = { phase: 'leave', t: 0 };
  }

  private spawnCustomer(delay: number) {
    const w = this.customers.find((c) => !c.busy);
    const seat = SEATS.findIndex((_, i) => i < this.tableLimit * 2 && !this.seatsTaken.has(i));
    if (!w || seat < 0) return;
    w.busy = true;
    w.seat = seat;
    this.seatsTaken.add(seat);
    w.wait = delay;
    const counter = { x: COUNTER_FRONT.xMin + Math.random() * (COUNTER_FRONT.xMax - COUNTER_FRONT.xMin), z: COUNTER_FRONT.z };
    if (this.still) {
      w.root.position.set(SEATS[seat].x, 0, SEATS[seat].z);
      w.root.rotation.y = SEATS[seat].rotY * DEG;
      w.phase = 'sit';
      w.wait = 2.5;
      playAction(w, 'sit');
    } else {
      w.root.position.set(ENTRY_PATH[0].x, 0, ENTRY_PATH[0].z);
      w.path = [...ENTRY_PATH.slice(1), counter];
      w.phase = 'in';
    }
    w.root.visible = delay <= 0;
  }

  private bakePizza(delay: number) {
    const p = this.pizzas.find((x) => x.t < 0);
    if (!p) return;
    p.t = 0;
    p.obj.userData.delay = delay;
    p.obj.visible = false;
  }

  private stepWalker(w: Walker, dt: number) {
    w.mixer.update(dt);
    if (!w.busy) return;
    if (w.wait > 0) {
      w.wait -= dt;
      if (w.wait > 0) return;
      w.root.visible = true;
      if (w.phase === 'counter') {
        w.phase = 'toSeat';
        w.path = [{ x: SEATS[w.seat].x, z: SEATS[w.seat].z + (SEATS[w.seat].rotY === 0 ? -0.35 : 0.35) }, SEATS[w.seat]];
      } else if (w.phase === 'sit') {
        if (this.still) return this.release(w);
        w.phase = 'out';
        w.path = [{ x: 7.4, z: 5.3 }, { x: 8.8, z: 6.8 }];
      }
    }
    const target = w.path[0];
    if (!target) return;
    const pos = w.root.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    const step = WALK_SPEED * dt;
    if (dist > 0.02) {
      playAction(w, 'walk');
      w.root.rotation.y = Math.atan2(dx, dz);
      const k = Math.min(1, step / dist);
      pos.x += dx * k;
      pos.z += dz * k;
      return;
    }
    w.path.shift();
    if (w.path.length > 0) return;
    if (w.phase === 'in') {
      w.phase = 'counter';
      w.root.rotation.y = Math.PI; // 카운터를 바라보며 주문
      playAction(w, 'interact-right');
      w.wait = 0.8;
    } else if (w.phase === 'toSeat') {
      w.phase = 'sit';
      w.root.rotation.y = SEATS[w.seat].rotY * DEG;
      playAction(w, 'sit');
      w.wait = 3.5;
    } else if (w.phase === 'out') {
      this.release(w);
    }
  }

  private release(w: Walker) {
    w.busy = false;
    w.phase = 'idle';
    w.root.visible = false;
    this.seatsTaken.delete(w.seat);
    w.seat = -1;
    playAction(w, 'idle');
  }

  private stepPizzas(dt: number) {
    for (const p of this.pizzas) {
      if (p.t < 0) continue;
      p.t += dt;
      const t = p.t - (p.obj.userData.delay ?? 0);
      if (t < 0) continue;
      p.obj.visible = true;
      const base = 0.3;
      const pop = t < 0.35 ? base * (0.5 + 0.75 * Math.sin((t / 0.35) * Math.PI * 0.75)) : base;
      p.obj.scale.setScalar(pop);
      if (t > 1.8) {
        p.obj.visible = false;
        p.t = -1;
      }
    }
  }

  private stepVan(dt: number) {
    if (!this.van || !this.vanTrip) return;
    const trip = this.vanTrip;
    trip.t += dt;
    const start = this.van.userData.baseZ ?? (this.van.userData.baseZ = this.van.position.z);
    if (trip.phase === 'leave') {
      const k = Math.min(1, trip.t / 1.2);
      this.van.position.z = start + (VAN.exitZ - VAN.z) * k * k;
      if (k >= 1) this.vanTrip = { phase: 'return', t: 0 };
    } else {
      const k = Math.min(1, trip.t / 1.5);
      const e = 1 - (1 - k) * (1 - k);
      this.van.position.z = start + (VAN.returnZ - VAN.z) * (1 - e);
      if (k >= 1) {
        this.van.position.z = start;
        this.vanTrip = null;
      }
    }
  }

  private frame() {
    if (this.disposed || document.hidden) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.ready) {
      for (const w of this.customers) this.stepWalker(w, dt);
      this.staffBusy = Math.max(0, this.staffBusy - dt);
      for (const s of this.staff) {
        playAction(s, this.staffBusy > 0 ? 'interact-right' : 'idle');
        s.mixer.update(dt);
      }
      this.stepPizzas(dt);
      this.stepVan(dt);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
