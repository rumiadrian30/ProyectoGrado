/**
 * ViewerControls.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Controlador de cámara unificado para el Canvas principal de GeoESPOCH 3D.
 *
 * Modos:
 *   'orbital'     — OrbitControls con límites polares para vista aérea.
 *                   maxPolarAngle = Math.PI/2.1 evita hundirse bajo el suelo.
 *   'firstperson' — Modo peatón WASD + ratón. Altura fija a 1.8 m sobre el
 *                   suelo (Y=1.8). Teclado + pantalla táctil compatible.
 *
 * Métodos expuestos vía useImperativeHandle (ref desde CampusViewer3D):
 *   resetCamera()  — vuelve a posición y target por defecto
 *   zoomIn()       — acerca la cámara
 *   zoomOut()      — aleja la cámara
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Configuración de cámara por defecto ────────────────────────────────────
const DEFAULT_POSITION = new THREE.Vector3(0, 80, 120);
const DEFAULT_TARGET   = new THREE.Vector3(0, 0, 0);

// ─── Parámetros del modo peatón ─────────────────────────────────────────────
const FP_HEIGHT        = 1.8;    // altura de los ojos en unidades de escena
const FP_MOVE_SPEED    = 0.28;   // unidades por frame
const FP_SPRINT_MULT   = 2.8;    // multiplicador al mantener Shift
const FP_MOUSE_SENS    = 0.0018; // sensibilidad del ratón
const FP_TOUCH_SENS    = 0.003;  // sensibilidad táctil
const FP_MIN_POLAR     = -Math.PI / 3;  // -60° tilt abajo
const FP_MAX_POLAR     = Math.PI / 3;   // +60° tilt arriba

const ViewerControls = forwardRef(function ViewerControls(
  {
    mode = 'orbital',
    defaultPosition = DEFAULT_POSITION,
    defaultTarget   = DEFAULT_TARGET,
  },
  ref
) {
  const { camera, gl } = useThree();
  const orbitRef  = useRef(null);

  // ─── Estado del movimiento en primera persona ──────────────────────────
  const keys    = useRef({});         // mapa de teclas presionadas
  const fpYaw   = useRef(0);          // rotación horizontal acumulada
  const fpPitch = useRef(0);          // rotación vertical acumulada
  const pointerLocked = useRef(false);
  const touchStart    = useRef(null); // {x, y} inicial táctil

  // ─── API pública vía ref ───────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    resetCamera() {
      camera.position.copy(
        defaultPosition instanceof THREE.Vector3
          ? defaultPosition
          : new THREE.Vector3(...defaultPosition)
      );
      camera.lookAt(
        defaultTarget instanceof THREE.Vector3
          ? defaultTarget
          : new THREE.Vector3(...defaultTarget)
      );
      if (orbitRef.current) {
        orbitRef.current.target.copy(
          defaultTarget instanceof THREE.Vector3
            ? defaultTarget
            : new THREE.Vector3(...defaultTarget)
        );
        orbitRef.current.update();
      }
      fpYaw.current   = 0;
      fpPitch.current = 0;
    },

    zoomIn() {
      if (mode === 'orbital' && orbitRef.current) {
        // Zoom suave: acerca el target en un 20 %
        const dir = new THREE.Vector3()
          .subVectors(orbitRef.current.target, camera.position)
          .normalize()
          .multiplyScalar(8);
        camera.position.add(dir);
        orbitRef.current.update();
      } else {
        // Primera persona: avanza
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize().multiplyScalar(6);
        camera.position.add(forward);
      }
    },

    zoomOut() {
      if (mode === 'orbital' && orbitRef.current) {
        const dir = new THREE.Vector3()
          .subVectors(camera.position, orbitRef.current.target)
          .normalize()
          .multiplyScalar(8);
        camera.position.add(dir);
        orbitRef.current.update();
      } else {
        const backward = new THREE.Vector3();
        camera.getWorldDirection(backward);
        backward.y = 0;
        backward.normalize().multiplyScalar(-6);
        camera.position.add(backward);
      }
    },
  }));

  // ─── Setup: cambio de modo ───────────────────────────────────────────
  useEffect(() => {
    if (mode === 'firstperson') {
      // Posicionar cámara a altura de ojos al entrar al modo FP
      camera.position.y = FP_HEIGHT;

      // Inicializar yaw/pitch desde orientación actual
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      fpYaw.current   = euler.y;
      fpPitch.current = euler.x;
    }

    // Liberar pointer lock si se cambia de modo
    if (mode !== 'firstperson' && document.pointerLockElement === gl.domElement) {
      document.exitPointerLock();
    }
  }, [mode, camera, gl]);

  // ─── Primera Persona: listeners de teclado ────────────────────────────
  useEffect(() => {
    if (mode !== 'firstperson') return;

    const onKeyDown = (e) => {
      keys.current[e.code] = true;
      // Activar pointer lock al primer movimiento
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (gl.domElement.requestPointerLock) gl.domElement.requestPointerLock();
      }
    };
    const onKeyUp   = (e) => { keys.current[e.code] = false; };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, [mode, gl]);

  // ─── Primera Persona: movimiento de ratón ────────────────────────────
  useEffect(() => {
    if (mode !== 'firstperson') return;

    const onPointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === gl.domElement;
    };
    const onMouseMove = (e) => {
      if (!pointerLocked.current) return;
      fpYaw.current   -= e.movementX * FP_MOUSE_SENS;
      fpPitch.current -= e.movementY * FP_MOUSE_SENS;
      fpPitch.current  = THREE.MathUtils.clamp(fpPitch.current, FP_MIN_POLAR, FP_MAX_POLAR);
    };

    const onCanvasClick = () => {
      if (!pointerLocked.current && gl.domElement.requestPointerLock) {
        gl.domElement.requestPointerLock();
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    gl.domElement.addEventListener('click', onCanvasClick);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      gl.domElement.removeEventListener('click', onCanvasClick);
      if (document.pointerLockElement === gl.domElement) document.exitPointerLock();
    };
  }, [mode, gl]);

  // ─── Primera Persona: touch drag ─────────────────────────────────────
  useEffect(() => {
    if (mode !== 'firstperson') return;
    const el = gl.domElement;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      if (!touchStart.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStart.current.x;
      const dy = e.touches[0].clientY - touchStart.current.y;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      fpYaw.current   -= dx * FP_TOUCH_SENS;
      fpPitch.current -= dy * FP_TOUCH_SENS;
      fpPitch.current  = THREE.MathUtils.clamp(fpPitch.current, FP_MIN_POLAR, FP_MAX_POLAR);
    };
    const onTouchEnd = () => { touchStart.current = null; };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [mode, gl]);

  // ─── Frame loop: primera persona ─────────────────────────────────────
  useFrame(() => {
    if (mode !== 'firstperson') return;

    const k       = keys.current;
    const sprint  = k['ShiftLeft'] || k['ShiftRight'];
    const speed   = FP_MOVE_SPEED * (sprint ? FP_SPRINT_MULT : 1);

    // Calcular vectores de dirección desde yaw (ignorar pitch para movimiento horizontal)
    const forward = new THREE.Vector3(
      -Math.sin(fpYaw.current),
      0,
      -Math.cos(fpYaw.current),
    ).normalize();
    const right = new THREE.Vector3(
      Math.cos(fpYaw.current),
      0,
      -Math.sin(fpYaw.current),
    ).normalize();

    const move = new THREE.Vector3();

    if (k['KeyW'] || k['ArrowUp'])    move.addScaledVector(forward,  speed);
    if (k['KeyS'] || k['ArrowDown'])  move.addScaledVector(forward, -speed);
    if (k['KeyA'] || k['ArrowLeft'])  move.addScaledVector(right,   -speed);
    if (k['KeyD'] || k['ArrowRight']) move.addScaledVector(right,    speed);

    camera.position.add(move);
    // Fijar altura del ojo
    camera.position.y = FP_HEIGHT;

    // Aplicar rotación desde yaw + pitch acumulados
    camera.quaternion.setFromEuler(
      new THREE.Euler(fpPitch.current, fpYaw.current, 0, 'YXZ'),
    );
  });

  // ─── Render ───────────────────────────────────────────────────────────
  if (mode === 'firstperson') return null; // FP usa solo frame loop

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      target={
        defaultTarget instanceof THREE.Vector3
          ? defaultTarget
          : new THREE.Vector3(...defaultTarget)
      }
      // Límites polares: evita Z-fighting y no deja pasar el suelo
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2.1}
      // Límites de zoom
      minDistance={8}
      maxDistance={350}
      // Damping suave
      enableDamping
      dampingFactor={0.06}
      // Velocidades
      rotateSpeed={0.7}
      zoomSpeed={1.2}
      panSpeed={0.8}
      // Permitir pan en desktop, no en móvil con 1 dedo
      enablePan={true}
      // Touch: 2 dedos rotan, pinch zoom
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
});

export default ViewerControls;