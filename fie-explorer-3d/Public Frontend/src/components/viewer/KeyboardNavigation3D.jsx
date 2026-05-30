import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE_SPEED = 30;
const FAST_MULTIPLIER = 2.8;
const ROTATE_SPEED = 1.8;

const LIMITS = {
  minX: -800,
  maxX: 800,
  minY: -2,
  maxY: 240,
  minZ: -500,
  maxZ: 500,
};

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
]);

function isEditableElement(target) {
  if (!target) return false;

  const tag = target.tagName?.toLowerCase();

  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}

function clampVector3(vector, limits = LIMITS) {
  vector.x = THREE.MathUtils.clamp(vector.x, limits.minX, limits.maxX);
  vector.y = THREE.MathUtils.clamp(vector.y, limits.minY, limits.maxY);
  vector.z = THREE.MathUtils.clamp(vector.z, limits.minZ, limits.maxZ);
}

export default function KeyboardNavigation3D({
  orbitRef,
  cameraCommandRef,
  enabled = true,
  onBoundsWarning,
}) {
  const { camera } = useThree();
  const keysRef = useRef({});

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event) => {
      if (isEditableElement(event.target)) return;
      if (!MOVEMENT_KEYS.has(event.code)) return;

      event.preventDefault();
      keysRef.current[event.code] = true;

      cameraCommandRef.current?.cancelAnimation?.();
    };

    const onKeyUp = (event) => {
      if (!MOVEMENT_KEYS.has(event.code)) return;

      event.preventDefault();
      keysRef.current[event.code] = false;
    };

    const onBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [enabled, cameraCommandRef]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const controls = orbitRef.current;
    if (!controls) return;

    const keys = keysRef.current;

    const forwardPressed = keys.KeyW || keys.ArrowUp;
    const backwardPressed = keys.KeyS || keys.ArrowDown;
    const leftPressed = keys.KeyA || keys.ArrowLeft;
    const rightPressed = keys.KeyD || keys.ArrowRight;
    const upPressed = keys.Space;
    const downPressed = keys.ControlLeft || keys.ControlRight;
    const fastPressed = keys.ShiftLeft || keys.ShiftRight;
    const rotateLeftPressed = keys.KeyQ;
    const rotateRightPressed = keys.KeyE;

    if (
        !forwardPressed &&
        !backwardPressed &&
        !leftPressed &&
        !rightPressed &&
        !upPressed &&
        !downPressed &&
        !rotateLeftPressed &&
        !rotateRightPressed
    ) {
        return;
    }

    cameraCommandRef.current?.cancelAnimation?.();

    const speed = BASE_SPEED * (fastPressed ? FAST_MULTIPLIER : 1);
    const step = speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.normalize();

    const right = new THREE.Vector3();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.normalize();

    const up = new THREE.Vector3(0, 1, 0);

    const movement = new THREE.Vector3();

    if (forwardPressed) movement.addScaledVector(forward, step);
    if (backwardPressed) movement.addScaledVector(forward, -step);

    if (rightPressed) movement.addScaledVector(right, step);
    if (leftPressed) movement.addScaledVector(right, -step);

    if (upPressed) movement.addScaledVector(up, step);
    if (downPressed) movement.addScaledVector(up, -step);

    if (rotateLeftPressed || rotateRightPressed) {
        const angle = ROTATE_SPEED * delta * (rotateLeftPressed ? 1 : -1);

        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        camera.position.copy(controls.target).add(offset);
    }

    camera.position.add(movement);
    controls.target.add(movement);
    const beforeClamp = camera.position.clone();
    clampVector3(camera.position);
    const wasClamped = !camera.position.equals(beforeClamp);
    if (wasClamped) {
      const correction = new THREE.Vector3().subVectors(camera.position, beforeClamp);
      controls.target.add(correction);
      clampVector3(controls.target);
      onBoundsWarning?.();
    }
    controls.update();
  });

  return null;
}