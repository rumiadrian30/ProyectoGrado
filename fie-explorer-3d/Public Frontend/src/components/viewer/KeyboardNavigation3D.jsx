/**
 * KeyboardNavigation3D.jsx — GeoESPOCH 3D
 * ─────────────────────────────────────────────────────────────────────────────
 * Navegación por teclado.
 *   - mode="orbit" (exterior): W/A/S/D o flechas desplazan cámara y objetivo,
 *     Espacio/Ctrl suben/bajan, Q/E giran alrededor del objetivo, Shift acelera.
 *     Limitado al terreno del campus (aviso al tocar el borde).
 *   - mode="walk" (interior): caminar a altura de los ojos; W/S avanzan en el
 *     plano del suelo según hacia dónde se mira, A/D laterales, Q/E giran la
 *     vista, Espacio/Ctrl ajustan la altura.
 * Compatible con frameloop="demand": pide frames mientras haya teclas pulsadas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { INTERIOR, WORLD_LIMITS } from './scene/constants';

const BASE_SPEED      = 38;
const FAST_MULTIPLIER = 4.2;
const ROTATE_SPEED    = 1.7;
const WALK_TURN_SPEED = 1.4;

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
]);

const UP = new THREE.Vector3(0, 1, 0);
const _forward  = new THREE.Vector3();
const _right    = new THREE.Vector3();
const _movement = new THREE.Vector3();
const _before   = new THREE.Vector3();
const _offset   = new THREE.Vector3();

function isEditableElement(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function clampVector3(vector, limits = WORLD_LIMITS) {
  vector.x = THREE.MathUtils.clamp(vector.x, limits.minX, limits.maxX);
  vector.y = THREE.MathUtils.clamp(vector.y, limits.minY, limits.maxY);
  vector.z = THREE.MathUtils.clamp(vector.z, limits.minZ, limits.maxZ);
}

export default function KeyboardNavigation3D({
  orbitRef,
  cameraCommandRef,
  mode = 'orbit',
  enabled = true,
  onBoundsWarning,
}) {
  const { camera, invalidate } = useThree();
  const keysRef = useRef({});

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event) => {
      if (isEditableElement(event.target)) return;
      if (!MOVEMENT_KEYS.has(event.code)) return;
      if (event.metaKey || event.altKey) return;

      event.preventDefault();
      if (!keysRef.current[event.code]) {
        keysRef.current[event.code] = true;
        cameraCommandRef.current?.cancelAnimation?.();
        invalidate();
      }
    };

    const onKeyUp = (event) => {
      if (!MOVEMENT_KEYS.has(event.code)) return;
      keysRef.current[event.code] = false;
    };

    const onBlur = () => { keysRef.current = {}; };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      keysRef.current = {};
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, cameraCommandRef, invalidate]);

  useFrame((_, rawDelta) => {
    if (!enabled) return;

    const keys = keysRef.current;
    const forwardPressed  = keys.KeyW || keys.ArrowUp;
    const backwardPressed = keys.KeyS || keys.ArrowDown;
    const leftPressed     = keys.KeyA || keys.ArrowLeft;
    const rightPressed    = keys.KeyD || keys.ArrowRight;
    const upPressed       = keys.Space;
    const downPressed     = keys.ControlLeft || keys.ControlRight;
    const fastPressed     = keys.ShiftLeft || keys.ShiftRight;
    const turnLeft        = keys.KeyQ;
    const turnRight       = keys.KeyE;

    if (!forwardPressed && !backwardPressed && !leftPressed && !rightPressed &&
        !upPressed && !downPressed && !turnLeft && !turnRight) {
      return;
    }

    const delta = Math.min(rawDelta, 0.05); // evita saltos tras una pestaña inactiva

    /* ── Modo interior: caminar ─────────────────────────────────────────── */
    if (mode === 'walk') {
      const speed = INTERIOR.walkSpeed * (fastPressed ? INTERIOR.runMultiplier : 1);
      const step  = speed * delta;

      camera.getWorldDirection(_forward);
      _forward.y = 0;
      if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
      _forward.normalize();
      _right.crossVectors(_forward, UP).normalize();

      _movement.set(0, 0, 0);
      if (forwardPressed)  _movement.addScaledVector(_forward, step);
      if (backwardPressed) _movement.addScaledVector(_forward, -step);
      if (rightPressed)    _movement.addScaledVector(_right, step);
      if (leftPressed)     _movement.addScaledVector(_right, -step);
      if (upPressed)       _movement.y += step * 0.6;
      if (downPressed)     _movement.y -= step * 0.6;

      if (turnLeft || turnRight) {
        camera.rotateOnWorldAxis(UP, WALK_TURN_SPEED * delta * (turnLeft ? 1 : -1));
      }

      camera.position.add(_movement);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, INTERIOR.eyeMin, INTERIOR.eyeMax);
      camera.updateMatrixWorld(true);
      invalidate();
      return;
    }

    /* ── Modo exterior: órbita libre ────────────────────────────────────── */
    const controls = orbitRef.current;
    if (!controls) return;

    const speed = BASE_SPEED * (fastPressed ? FAST_MULTIPLIER : 1);
    const step  = speed * delta;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
    _forward.normalize();
    _right.setFromMatrixColumn(camera.matrixWorld, 0);
    _right.y = 0;
    _right.normalize();

    _movement.set(0, 0, 0);
    if (forwardPressed)  _movement.addScaledVector(_forward, step);
    if (backwardPressed) _movement.addScaledVector(_forward, -step);
    if (rightPressed)    _movement.addScaledVector(_right, step);
    if (leftPressed)     _movement.addScaledVector(_right, -step);
    if (upPressed)       _movement.addScaledVector(UP, step);
    if (downPressed)     _movement.addScaledVector(UP, -step);

    if (turnLeft || turnRight) {
      const angle = ROTATE_SPEED * delta * (turnLeft ? 1 : -1);
      _offset.subVectors(camera.position, controls.target).applyAxisAngle(UP, angle);
      camera.position.copy(controls.target).add(_offset);
    }

    camera.position.add(_movement);
    controls.target.add(_movement);

    _before.copy(camera.position);
    clampVector3(camera.position);

    if (!camera.position.equals(_before)) {
      _offset.subVectors(camera.position, _before);
      controls.target.add(_offset);
      clampVector3(controls.target);
      onBoundsWarning?.();
    }

    controls.update();
    invalidate();
  });

  return null;
}
