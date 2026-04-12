require('dotenv').config();
const app  = require('./app');
const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
  console.log(`[FIE Backend] Servidor corriendo en http://localhost:${port}`);
  console.log(`[FIE Backend] Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[FIE Backend] API disponible en http://localhost:${port}/api`);
});

// Cierre elegante
process.on('SIGTERM', () => {
  console.log('[FIE Backend] SIGTERM recibido. Cerrando servidor...');
  server.close(() => process.exit(0));
});
