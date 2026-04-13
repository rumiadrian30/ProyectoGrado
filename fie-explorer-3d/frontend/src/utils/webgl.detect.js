/**
 * Detecta soporte de WebGL 2 (requerido por Three.js moderno).
 * Devuelve { supported: bool, message: string }
 */
export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const ctx =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!ctx) return { supported: false, message: 'Tu navegador no soporta WebGL.' };
    return { supported: true, message: 'WebGL disponible' };
  } catch {
    return { supported: false, message: 'Error al inicializar WebGL.' };
  }
}
