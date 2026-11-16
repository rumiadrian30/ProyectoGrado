/**
 * InteriorMouseLook.jsx — GeoESPOCH 3D
 * Mirar alrededor en modo interior arrastrando (ratón o dedo) y avanzar /
 * retroceder con la rueda del ratón en la dirección de la mirada.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INTERIOR } from './constants';

const PITCH_LIMIT = Math.PI / 2 - 0.05;
const _forward = new THREE.Vector3();

export default function InteriorMouseLook({ active, isMobile = false, cameraCommandRef }) {
  const { camera, gl, invalidate } = useThree();

  const draggingRef = useRef(false);
  const pointerIdRef = useRef(null);
  const yawRef   = useRef(0);
  const pitchRef = useRef(0);

  const syncFromCamera = useCallback(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yawRef.current   = euler.y;
    pitchRef.current = THREE.MathUtils.clamp(euler.x, -PITCH_LIMIT, PITCH_LIMIT);
  }, [camera]);

  useEffect(() => {
    if (!active) return;
    syncFromCamera();
  }, [active, syncFromCamera]);

  useEffect(() => {
    if (!active) return;

    const canvas = gl.domElement;
    const prev = {
      cursor: canvas.style.cursor,
      touchAction: canvas.style.touchAction,
      userSelect: canvas.style.userSelect,
    };

    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';

    const applyRotation = () => {
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitchRef.current, yawRef.current, 0);
      camera.updateMatrixWorld(true);
      invalidate();
    };

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      draggingRef.current = true;
      pointerIdRef.current = event.pointerId;
      canvas.style.cursor = 'grabbing';
      cameraCommandRef?.current?.cancelAnimation?.();
      syncFromCamera();

      try { canvas.setPointerCapture(event.pointerId); } catch { /* móvil */ }
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;

      const sensitivity = isMobile ? 0.0032 : 0.0022;
      yawRef.current   -= event.movementX * sensitivity;
      pitchRef.current  = THREE.MathUtils.clamp(
        pitchRef.current - event.movementY * sensitivity, -PITCH_LIMIT, PITCH_LIMIT,
      );

      applyRotation();
      event.preventDefault();
    };

    const stopDragging = (event) => {
      if (event?.pointerId && pointerIdRef.current !== null && event.pointerId !== pointerIdRef.current) return;

      draggingRef.current = false;
      pointerIdRef.current = null;
      canvas.style.cursor = 'grab';

      if (event?.pointerId) {
        try { canvas.releasePointerCapture(event.pointerId); } catch { /* sin acción */ }
      }
    };

    const onWheel = (event) => {
      event.preventDefault();
      cameraCommandRef?.current?.cancelAnimation?.();

      const step = THREE.MathUtils.clamp(-event.deltaY * 0.012, -1.4, 1.4);
      camera.getWorldDirection(_forward);
      camera.position.addScaledVector(_forward, step);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, INTERIOR.eyeMin, INTERIOR.eyeMax);
      camera.updateMatrixWorld(true);
      invalidate();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', stopDragging);
    canvas.addEventListener('pointercancel', stopDragging);
    canvas.addEventListener('lostpointercapture', stopDragging);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      draggingRef.current = false;
      pointerIdRef.current = null;

      canvas.style.cursor = prev.cursor;
      canvas.style.touchAction = prev.touchAction;
      canvas.style.userSelect = prev.userSelect;

      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', stopDragging);
      canvas.removeEventListener('pointercancel', stopDragging);
      canvas.removeEventListener('lostpointercapture', stopDragging);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [active, camera, gl, isMobile, syncFromCamera, invalidate, cameraCommandRef]);

  return null;
}
