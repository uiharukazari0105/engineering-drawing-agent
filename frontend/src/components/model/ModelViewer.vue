<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Box, Maximize2, Orbit, Ruler } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GeometryModel } from "@/types/api";

const props = defineProps<{
  geometry: GeometryModel | null;
  highlight: string[];
}>();

const PART_COLOR = 0x6c8491;
const EDGE_COLOR = 0x44565f;
const HOLE_COLOR = 0x507a91;
const FLAG_COLOR = 0xa65e58;
const MAX_DIM_FALLBACK = 120;

interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  axes: THREE.AxesHelper;
  modelGroup: THREE.Group | null;
  plateMaterial: THREE.MeshStandardMaterial | null;
  dimensionObjects: THREE.Object3D[];
  holeMaterials: Record<string, THREE.MeshStandardMaterial>;
  flagged: THREE.Object3D[];
  maxDimension: number;
}

const host = ref<HTMLDivElement | null>(null);
const autoRotate = ref(false);
const wireframe = ref(false);
const dimensions = ref(true);
let context: SceneContext | null = null;
let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;

const ariaLabel = computed(() =>
  props.geometry
    ? `三维模型：${props.geometry.bbox.length}×${props.geometry.bbox.width}×${props.geometry.bbox.height}，${props.geometry.hole_count} 个孔`
    : "三维模型预览",
);

function makeLabel(text: string, color: string) {
  const canvas = document.createElement("canvas");
  const context2d = canvas.getContext("2d");
  if (!context2d) return new THREE.Sprite();
  context2d.font = "600 44px Consolas, monospace";
  canvas.width = context2d.measureText(text).width + 32;
  canvas.height = 72;
  context2d.font = "600 44px Consolas, monospace";
  context2d.fillStyle = "rgba(252,251,247,0.96)";
  context2d.fillRect(0, 0, canvas.width, canvas.height);
  context2d.strokeStyle = color;
  context2d.lineWidth = 3;
  context2d.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
  context2d.fillStyle = color;
  context2d.textBaseline = "middle";
  context2d.fillText(text, 16, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(canvas.width * 0.09, canvas.height * 0.09, 1);
  return sprite;
}

function disposeObject(object: THREE.Object3D | null) {
  if (!object) return;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    materials.forEach((material) => {
      const texture = (material as THREE.MeshStandardMaterial).map;
      texture?.dispose();
      material.dispose();
    });
  });
}

function rebuildModel() {
  if (!context) return;
  if (context.modelGroup) {
    context.scene.remove(context.modelGroup);
    disposeObject(context.modelGroup);
  }

  const group = new THREE.Group();
  context.modelGroup = group;
  context.scene.add(group);
  context.holeMaterials = {};
  context.flagged = [];
  context.dimensionObjects = [];

  const bbox = props.geometry?.bbox ?? {
    length: MAX_DIM_FALLBACK,
    width: 80,
    height: 6,
  };
  const { length: lengthValue, width, height } = bbox;
  const maxDimension = Math.max(lengthValue, width);
  context.maxDimension = maxDimension;

  const plateMaterial = new THREE.MeshStandardMaterial({
    color: PART_COLOR,
    metalness: 0.28,
    roughness: 0.46,
    transparent: true,
    opacity: 0.97,
    wireframe: wireframe.value,
  });
  context.plateMaterial = plateMaterial;
  group.add(new THREE.Mesh(new THREE.BoxGeometry(lengthValue, width, height), plateMaterial));

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(lengthValue, width, height)),
    new THREE.LineBasicMaterial({
      color: EDGE_COLOR,
      transparent: true,
      opacity: 0.7,
    }),
  );
  group.add(edges);

  for (const hole of props.geometry?.holes ?? []) {
    if (hole.d == null) continue;
    const material = new THREE.MeshStandardMaterial({
      color: HOLE_COLOR,
      emissive: new THREE.Color(HOLE_COLOR),
      emissiveIntensity: 0.04,
      transparent: true,
      opacity: 0.72,
      roughness: 0.4,
    });
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(hole.d / 2, hole.d / 2, height * 1.8, 30),
      material,
    );
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.set(hole.x - lengthValue / 2, hole.y - width / 2, 0);
    cylinder.name = hole.id;
    group.add(cylinder);
    context.holeMaterials[hole.id] = material;
  }

  group.rotation.x = -Math.PI / 2;
  context.axes.position.set(-lengthValue / 2 - 6, -height / 2, width / 2 + 6);
  context.axes.scale.setScalar(Math.max(0.4, maxDimension / MAX_DIM_FALLBACK));

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x8b6b38,
    transparent: true,
    opacity: 0.78,
  });
  const offset = height / 2 + 5;
  const lengthLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-lengthValue / 2, -width / 2 - 6, offset),
    new THREE.Vector3(lengthValue / 2, -width / 2 - 6, offset),
  ]);
  const widthLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-lengthValue / 2 - 6, -width / 2, offset),
    new THREE.Vector3(-lengthValue / 2 - 6, width / 2, offset),
  ]);
  const lengthLabel = makeLabel(String(lengthValue), "#785b2d");
  lengthLabel.position.set(0, -width / 2 - 10, offset);
  const widthLabel = makeLabel(String(width), "#785b2d");
  widthLabel.position.set(-lengthValue / 2 - 12, 0, offset);
  context.dimensionObjects = [
    new THREE.Line(lengthLine, lineMaterial),
    new THREE.Line(widthLine, lineMaterial),
    lengthLabel,
    widthLabel,
  ];
  context.dimensionObjects.forEach((object) => {
    object.visible = dimensions.value;
    group.add(object);
  });

  const distance =
    Math.hypot(
      context.camera.position.x,
      context.camera.position.y,
      context.camera.position.z,
    ) || maxDimension;
  context.camera.position.multiplyScalar((maxDimension * 1.2) / distance);
  context.controls.minDistance = maxDimension * 0.6;
  context.controls.maxDistance = maxDimension * 4;
  context.controls.update();
  applyHighlight();
}

function applyHighlight() {
  if (!context) return;
  context.flagged = [];
  for (const [id, material] of Object.entries(context.holeMaterials)) {
    const active = props.highlight.includes(id);
    material.color.set(active ? FLAG_COLOR : HOLE_COLOR);
    material.emissive.set(active ? FLAG_COLOR : HOLE_COLOR);
    material.emissiveIntensity = active ? 0.5 : 0.04;
    material.opacity = active ? 0.98 : 0.72;
  }
  context.modelGroup?.traverse((object) => {
    if (props.highlight.includes(object.name)) context?.flagged.push(object);
  });
}

function resetView() {
  if (!context) return;
  const dimension = context.maxDimension || MAX_DIM_FALLBACK;
  context.camera.position.set(dimension * 1.05, dimension * 1.15, dimension * 1.15);
  context.controls.target.set(0, 0, 0);
  context.controls.update();
}

onMounted(() => {
  const element = host.value;
  if (!element) return;
  const width = element.clientWidth || 560;
  const height = element.clientHeight || 380;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.setClearAlpha(0);
  element.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 8000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4cfc6, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(160, -220, 260);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fa8b4, 0.55);
  rim.position.set(-240, 140, -180);
  scene.add(rim);

  const axes = new THREE.AxesHelper(26);
  const axisMaterial = axes.material as THREE.Material;
  axisMaterial.transparent = true;
  axisMaterial.opacity = 0.42;
  scene.add(axes);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.minDistance = MAX_DIM_FALLBACK * 0.6;
  controls.maxDistance = MAX_DIM_FALLBACK * 4;
  controls.autoRotateSpeed = 1.1;
  controls.target.set(0, 0, 0);
  camera.position.set(126, 138, 138);
  controls.update();

  context = {
    renderer,
    scene,
    camera,
    controls,
    axes,
    modelGroup: null,
    plateMaterial: null,
    dimensionObjects: [],
    holeMaterials: {},
    flagged: [],
    maxDimension: MAX_DIM_FALLBACK,
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  const animate = () => {
    animationFrame = requestAnimationFrame(animate);
    if (!reducedMotion && context?.flagged.length) {
      const pulse = 1 + 0.06 * Math.sin(clock.getElapsedTime() * 3.4);
      context.flagged.forEach((object) => object.scale.set(pulse, 1, pulse));
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const resize = () => {
    if (!host.value) return;
    const nextWidth = host.value.clientWidth;
    const nextHeight = host.value.clientHeight;
    renderer.setSize(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  };
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(element);
  window.addEventListener("resize", resize);
  rebuildModel();
});

watch(
  () => props.geometry,
  () => rebuildModel(),
  { deep: true },
);
watch(() => props.highlight, applyHighlight, { deep: true });
watch(wireframe, (value) => {
  if (context?.plateMaterial) context.plateMaterial.wireframe = value;
});
watch(dimensions, (value) => context?.dimensionObjects.forEach((object) => (object.visible = value)));
watch(autoRotate, (value) => {
  if (context) context.controls.autoRotate = value;
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  if (!context) return;
  disposeObject(context.modelGroup);
  context.controls.dispose();
  context.renderer.dispose();
  context.renderer.forceContextLoss?.();
  context = null;
});
</script>

<template>
  <div class="viewport-shell" role="img" :aria-label="ariaLabel">
    <div ref="host" class="viewport-canvas" />
    <div
      v-if="!geometry"
      class="absolute inset-0 grid content-center justify-items-center gap-2 bg-[#e8e5ded6] text-center text-[11px] text-muted-foreground"
    >
      <Box :size="26" />
      <span>解析图纸后在此生成参数化模型</span>
    </div>
    <div v-else class="absolute left-2 top-2 flex gap-1">
      <Badge>{{ geometry.bbox.length }}×{{ geometry.bbox.width }}×{{ geometry.bbox.height }}</Badge>
      <Badge>孔 {{ geometry.hole_count }}</Badge>
    </div>
    <div class="absolute right-2 top-2 flex gap-0.5 rounded border border-border bg-card/95 p-0.5">
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :class="{ 'bg-primary text-primary-foreground hover:bg-primary': autoRotate }"
        title="自动旋转"
        @click="autoRotate = !autoRotate"
      >
        <Orbit :size="15" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :class="{ 'bg-primary text-primary-foreground hover:bg-primary': wireframe }"
        title="线框"
        @click="wireframe = !wireframe"
      >
        <Box :size="15" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        :class="{ 'bg-primary text-primary-foreground hover:bg-primary': dimensions }"
        title="尺寸标注"
        @click="dimensions = !dimensions"
      >
        <Ruler :size="15" />
      </Button>
      <Button variant="ghost" size="icon" class="size-7" title="重置视角" @click="resetView">
        <Maximize2 :size="15" />
      </Button>
    </div>
  </div>
</template>
