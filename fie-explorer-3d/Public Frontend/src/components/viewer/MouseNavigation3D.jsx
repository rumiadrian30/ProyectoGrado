import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HOLD_DELAY_MS = 120;
const MOVE_SPEED = 48;
const FAST_MULTIPLIER = 2.5;

export default function MouseNavigation3D({
  orbitRef,
  cameraCommandRef,
  enabled = true,
}) {
  const { camera, gl } = useThree();

  const leftPressedRef = useRef(false);
  const leftStartTimeRef = useRef(0);
  const shiftPressedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;

      leftPressedRef.current = true;
      leftStartTimeRef.current = performance.now();

      cameraCommandRef.current?.cancelAnimation?.();
    };

    const onPointerUp = (event) => {
      if (event.button !== 0) return;

      leftPressedRef.current = false;
    };

    const onPointerLeave = () => {
      leftPressedRef.current = false;
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    const onKeyDown = (event) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        shiftPressedRef.current = true;
      }
    };

    const onKeyUp = (event) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        shiftPressedRef.current = false;
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('contextmenu', onContextMenu);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, gl, cameraCommandRef]);

  useFrame((_, delta) => {
    if (!enabled || !leftPressedRef.current) return;

    const elapsed = performance.now() - leftStartTimeRef.current;

    if (elapsed < HOLD_DELAY_MS) return;

    const controls = orbitRef.current;
    if (!controls) return;

    cameraCommandRef.current?.cancelAnimation?.();

    const speed = MOVE_SPEED * (shiftPressedRef.current ? FAST_MULTIPLIER : 1);
    const step = speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    forward.normalize();

    const movement = forward.multiplyScalar(step);

    camera.position.add(movement);
    controls.target.add(movement);
    controls.update();
  });

  return null;
}