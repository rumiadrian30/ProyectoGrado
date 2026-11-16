/**
 * CameraRig.jsx — GeoESPOCH 3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Controla los vuelos de cámara del visor:
 *   - Vuelos con duración y curva suave (smoothstep), independientes del
 *     framerate, interrumpibles por el usuario.
 *   - Encuadre automático de edificios a partir de su bounding box real
 *     (cuando el modelo todavía no cargó usa una estimación y re-encuadra
 *     al llegar los bounds, salvo que el usuario ya haya movido la cámara).
 *   - Vista "inicio" que encuadra todos los edificios activos.
 *   - Recorrido automático (órbita lenta alrededor del objetivo).
 *   - Comandos expuestos vía `cameraCommandRef` para el HUD y Explorer.jsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMERA, CAMERA_INITIAL, easeSmooth, flightDuration } from './constants';
import {
  findBuildingModel,
  getModelPosition,
  getFocusKey,
} from '../../../utils/viewer3DHelpers';

const UP = new THREE.Vector3(0, 1, 0);
const TOUR_SPEED = 0.22; // rad/s

const _vec    = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _sphere = new THREE.Sphere();

/** Vista que encuadra todos los edificios (o la vista por defecto). */
export function computeHomeView(buildings = [], allModels = []) {
  const points = buildings.map((b) => {
    const p = getModelPosition(findBuildingModel(allModels, b), b);
    return new THREE.Vector3(p.x, p.y, p.z);
  });

  if (!points.length) {
    return { position: [...CAMERA_INITIAL.position], target: [...CAMERA_INITIAL.target] };
  }

  const center = points.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(points.length);
  let radius = 0;
  points.forEach((p) => { radius = Math.max(radius, p.distanceTo(center)); });
  radius = Math.max(radius + 40, 90);

  const fov  = THREE.MathUtils.degToRad(CAMERA.fov);
  const dist = Math.min(CAMERA.maxDistance * 0.95, (radius / Math.sin(fov / 2)) * 0.68);

  const elev = 0.6;   // ~34°
  const az   = 0.32;  // ligeramente girado respecto al sur
  const dir  = new THREE.Vector3(
    Math.sin(az) * Math.cos(elev),
    Math.sin(elev),
    Math.cos(az) * Math.cos(elev),
  );

  center.y = 0;
  const position = center.clone().addScaledVector(dir, dist);

  return { position: position.toArray(), target: center.toArray() };
}

export default function CameraRig({
  orbitRef,
  cameraCommandRef,
  onCameraCommandReady,
  selectedBuilding,
  allModels,
  buildings,
  boundsRef,
  boundsVersion,
  interiorMode,
  onTourChange,
}) {
  const { camera, invalidate } = useThree();

  const flightRef   = useRef(null);
  const tourRef     = useRef(false);
  const userMoved   = useRef(false);
  const awaiting    = useRef(null);  // id de edificio esperando bounds
  const lastFocus   = useRef(null);

  // Refs espejo para leer siempre el valor actual desde los comandos
  const selectedRef = useRef(selectedBuilding);
  const modelsRef   = useRef(allModels);
  const buildingsRef = useRef(buildings);
  const interiorRef = useRef(interiorMode);
  useEffect(() => { selectedRef.current  = selectedBuilding; }, [selectedBuilding]);
  useEffect(() => { modelsRef.current    = allModels; }, [allModels]);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { interiorRef.current  = interiorMode; }, [interiorMode]);

  /* ── Tour ─────────────────────────────────────────────────────────────── */
  const setTour = useCallback((active) => {
    if (tourRef.current === active) return;
    tourRef.current = active;
    onTourChange?.(active);
    invalidate();
  }, [onTourChange, invalidate]);

  /* ── Vuelos ───────────────────────────────────────────────────────────── */
  const flyTo = useCallback((position, target, { quaternion = null, duration } = {}) => {
    const controls = orbitRef.current;
    const toPos    = new THREE.Vector3().fromArray(position);
    const toTarget = new THREE.Vector3().fromArray(target);

    // Vaciar la inercia pendiente de OrbitControls para que no "pelee"
    if (controls && controls.enabled) {
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damping;
    }

    const dist = camera.position.distanceTo(toPos);

    flightRef.current = {
      fromPos:    camera.position.clone(),
      toPos,
      fromTarget: (controls?.target ?? toTarget).clone(),
      toTarget,
      fromQuat:   camera.quaternion.clone(),
      toQuat:     quaternion ? quaternion.clone() : null,
      start:      performance.now(),
      duration:   (duration ?? flightDuration(dist)) * 1000,
    };

    if (quaternion && controls) controls.enabled = false;

    setTour(false);
    userMoved.current = false;
    invalidate();
  }, [camera, orbitRef, invalidate, setTour]);

  const cancelAnimation = useCallback(() => {
    flightRef.current = null;
    userMoved.current = true;
    awaiting.current  = null;
    setTour(false);

    const controls = orbitRef.current;
    if (controls && !interiorRef.current) {
      controls.enabled = true;
      controls.enableDamping = true;
    }
  }, [orbitRef, setTour]);

  /* ── Encuadres ────────────────────────────────────────────────────────── */
  const goHome = useCallback(() => {
    const view = computeHomeView(buildingsRef.current, modelsRef.current);
    flyTo(view.position, view.target);
  }, [flyTo]);

  const focusBuilding = useCallback((building) => {
    if (!building) { goHome(); return; }

    const box = boundsRef?.current?.get(String(building.id));

    if (box && !box.isEmpty()) {
      box.getBoundingSphere(_sphere);
      const radius = Math.max(_sphere.radius, 8);
      const fov    = THREE.MathUtils.degToRad(CAMERA.fov);
      const dist   = THREE.MathUtils.clamp((radius / Math.sin(fov / 2)) * 1.12, 24, 420);

      // Mantener el azimut actual respecto al edificio; elevación fija
      _vec.subVectors(camera.position, _sphere.center);
      _vec.y = 0;
      if (_vec.lengthSq() < 1) _vec.set(0.55, 0, 1);
      _vec.normalize();

      const elev = 0.5;
      const dir  = new THREE.Vector3(_vec.x * Math.cos(elev), Math.sin(elev), _vec.z * Math.cos(elev));

      const target = _sphere.center.clone();
      target.y = Math.max(box.min.y + radius * 0.15, _sphere.center.y - radius * 0.3);

      awaiting.current = null;
      flyTo(target.clone().addScaledVector(dir, dist).toArray(), target.toArray());
      return;
    }

    // Sin bounds todavía: estimación y re-encuadre cuando lleguen
    const model = findBuildingModel(modelsRef.current, building);
    const pos   = getModelPosition(model, building);
    awaiting.current = String(building.id);
    flyTo(
      [pos.x + 45, Math.max(pos.y + 55, 55), pos.z + 75],
      [pos.x, pos.y + 6, pos.z],
    );
  }, [boundsRef, camera, flyTo, goHome]);

  /* ── Comandos públicos ────────────────────────────────────────────────── */
  useEffect(() => {
    const zoomBy = (factor) => {
      cancelAnimation();
      const controls = orbitRef.current;
      if (!controls) return;

      _offset.subVectors(camera.position, controls.target);
      const distance = THREE.MathUtils.clamp(
        _offset.length() * factor, CAMERA.minDistance, CAMERA.maxDistance,
      );
      _offset.setLength(distance);
      flyTo(_vec.copy(controls.target).add(_offset).toArray(), controls.target.toArray(), { duration: 0.55 });
    };

    const rotateBy = (deg) => {
      cancelAnimation();
      const controls = orbitRef.current;
      if (!controls) return;

      _offset.subVectors(camera.position, controls.target);
      _offset.applyAxisAngle(UP, THREE.MathUtils.degToRad(deg));
      flyTo(_vec.copy(controls.target).add(_offset).toArray(), controls.target.toArray(), { duration: 0.6 });
    };

    const commands = {
      cancelAnimation,
      moveTo: (position, target, quaternion = null) => flyTo(position, target, { quaternion }),
      flyTo,

      reset() {
        lastFocus.current = null;
        goHome();
      },

      focusBuilding(building) {
        if (!building) return;
        const model = findBuildingModel(modelsRef.current, building);
        lastFocus.current = getFocusKey(building, model);
        focusBuilding(building);
      },

      top() {
        const building = selectedRef.current;
        const controls = orbitRef.current;

        // Vista cenital "casi" vertical (≈82°): mantener un pequeño
        // desplazamiento horizontal en el azimut actual evita que la cámara
        // pierda la referencia de "arriba" y gire sin control, y conserva la
        // orientación del mapa que el usuario ya tenía.
        const cenital = (center, height) => {
          const from = controls?.target ?? center;
          _vec.subVectors(camera.position, from);
          _vec.y = 0;
          if (_vec.lengthSq() < 1) _vec.set(0, 0, 1);
          _vec.normalize();

          const lateral = height * 0.14;
          flyTo(
            [center.x + _vec.x * lateral, center.y + height, center.z + _vec.z * lateral],
            center.toArray(),
          );
        };

        if (building) {
          const box   = boundsRef?.current?.get(String(building.id));
          const model = findBuildingModel(modelsRef.current, building);
          const pos   = getModelPosition(model, building);
          const center = new THREE.Vector3(pos.x, pos.y, pos.z);
          let height = 120;

          if (box && !box.isEmpty()) {
            box.getBoundingSphere(_sphere);
            center.set(_sphere.center.x, box.min.y, _sphere.center.z);
            height = THREE.MathUtils.clamp(_sphere.radius * 3.2, 70, 320);
          }

          cenital(center, height);
          return;
        }

        const view   = computeHomeView(buildingsRef.current, modelsRef.current);
        const center = new THREE.Vector3().fromArray(view.target);
        const height = Math.max(
          260,
          new THREE.Vector3().fromArray(view.position).distanceTo(center) * 0.9,
        );
        cenital(center, height);
      },

      lookAtPoint(point) {
        const controls = orbitRef.current;
        if (!controls || !point) return;
        cancelAnimation();

        const target = new THREE.Vector3(point.x, Math.max(point.y, 0), point.z);
        _offset.subVectors(camera.position, controls.target);
        if (_offset.length() > 240) _offset.setLength(240);

        flyTo(target.clone().add(_offset).toArray(), target.toArray(), { duration: 1.0 });
      },

      zoomIn()      { zoomBy(0.72); },
      zoomOut()     { zoomBy(1.38); },
      rotateLeft()  { rotateBy(22); },
      rotateRight() { rotateBy(-22); },

      toggleTour() {
        if (interiorRef.current) return;
        if (tourRef.current) { setTour(false); return; }
        flightRef.current = null;
        setTour(true);
      },

      isTourActive: () => tourRef.current,
      isFlying:     () => !!flightRef.current,
    };

    cameraCommandRef.current = commands;
    onCameraCommandReady?.(commands);
  }, [
    camera, orbitRef, cameraCommandRef, boundsRef,
    flyTo, cancelAnimation, focusBuilding, goHome, setTour, onCameraCommandReady,
  ]);

  /* ── Modo interior: OrbitControls fuera ───────────────────────────────── */
  useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) return;

    if (interiorMode) {
      setTour(false);
      controls.enabled = false;
      controls.enableDamping = false;
      controls.autoRotate = false;
      return;
    }

    controls.enabled = true;
    controls.enableDamping = true;
    controls.autoRotate = false;
    controls.update();
    invalidate();
  }, [interiorMode, orbitRef, setTour, invalidate]);

  /* ── Selección → encuadre ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedBuilding) {
      if (lastFocus.current !== null) {
        lastFocus.current = null;
        goHome();
      }
      return;
    }

    const model = findBuildingModel(allModels, selectedBuilding);
    const key   = getFocusKey(selectedBuilding, model);
    if (lastFocus.current === key) return;

    lastFocus.current = key;
    focusBuilding(selectedBuilding);
  }, [selectedBuilding, allModels, focusBuilding, goHome]);

  /* ── Bounds recién disponibles → re-encuadrar si seguimos esperando ───── */
  useEffect(() => {
    const id = awaiting.current;
    if (!id || userMoved.current || interiorRef.current) return;
    const building = selectedRef.current;
    if (!building || String(building.id) !== id) return;
    if (!boundsRef?.current?.has(id)) return;

    focusBuilding(building);
  }, [boundsVersion, boundsRef, focusBuilding]);

  /* ── Frame loop ───────────────────────────────────────────────────────── */
  useFrame((_, delta) => {
    const controls = orbitRef.current;
    const flight   = flightRef.current;
    const interior = interiorRef.current;

    if (flight) {
      const raw = Math.min(1, (performance.now() - flight.start) / flight.duration);
      const t   = easeSmooth(raw);

      camera.position.lerpVectors(flight.fromPos, flight.toPos, t);

      if (flight.toQuat) {
        camera.quaternion.slerpQuaternions(flight.fromQuat, flight.toQuat, t);
      } else {
        _vec.lerpVectors(flight.fromTarget, flight.toTarget, t);
        camera.lookAt(_vec);
      }

      if (controls && !interior) {
        controls.target.lerpVectors(flight.fromTarget, flight.toTarget, t);
      }

      camera.updateMatrixWorld(true);

      if (raw >= 1) {
        flightRef.current = null;
        camera.position.copy(flight.toPos);

        if (flight.toQuat) {
          camera.quaternion.copy(flight.toQuat);
        } else {
          camera.lookAt(flight.toTarget);
        }
        camera.updateMatrixWorld(true);

        if (controls) {
          controls.enabled = !interior;
          if (!interior) {
            controls.target.copy(flight.toTarget);
            controls.enableDamping = true;
            controls.update();
          }
        }
      }

      invalidate();
      return;
    }

    if (tourRef.current && controls && !interior) {
      _offset.subVectors(camera.position, controls.target);
      _offset.applyAxisAngle(UP, Math.min(delta, 0.05) * TOUR_SPEED);
      camera.position.copy(controls.target).add(_offset);
      controls.update();
      invalidate();
    }
  });

  return null;
}
