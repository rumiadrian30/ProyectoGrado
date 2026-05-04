/**
 * swagger.js
 * Definición OpenAPI 3.0 completa para FIE Explorer 3D API.
 * Montado en /api/docs por swagger-ui-express.
 */

const swaggerUi  = require('swagger-ui-express');

// ── Esquemas reutilizables ─────────────────────────────────────────────────
const schemas = {
  // ─── Auth ────────────────────────────────────────────────────────────────
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email:    { type: 'string', format: 'email', example: 'admin@espoch.edu.ec' },
      password: { type: 'string', format: 'password', example: 'Admin$2026!' },
    },
  },
  LoginResponse: {
    type: 'object',
    properties: {
      message:  { type: 'string', example: 'Login exitoso.' },
      admin: {
        type: 'object',
        properties: {
          id:       { type: 'integer', example: 1 },
          email:    { type: 'string',  example: 'admin@espoch.edu.ec' },
          full_name:{ type: 'string',  example: 'Administrador ESPOCH' },
          role:     { type: 'string',  enum: ['admin', 'superadmin'], example: 'superadmin' },
        },
      },
    },
  },
  MeResponse: {
    type: 'object',
    properties: {
      id:       { type: 'integer', example: 1 },
      email:    { type: 'string',  example: 'admin@espoch.edu.ec' },
      full_name:{ type: 'string',  example: 'Administrador ESPOCH' },
      role:     { type: 'string',  enum: ['admin','superadmin'] },
    },
  },

  // ─── Hotspot ─────────────────────────────────────────────────────────────
  HotspotBase: {
    type: 'object',
    properties: {
      building_id: { type: 'integer',  example: 1 },
      name:        { type: 'string',   example: 'Laboratorio de Redes' },
      description: { type: 'string',   example: 'Laboratorio con 30 equipos Cisco' },
      type:        { type: 'string',   enum: ['lab','office','service','access'], example: 'lab' },
      floor:       { type: 'integer',  example: 2 },
      pos_x:       { type: 'number',   example: 12.5 },
      pos_y:       { type: 'number',   example: 4.0 },
      pos_z:       { type: 'number',   example: -8.3 },
      schedule:    { type: 'string',   example: 'Lun–Vie 08:00–18:00', nullable: true },
      equipment:   { type: 'string',   example: 'Cisco 2911, 30 PCs', nullable: true },
    },
  },
  HotspotCreate: {
    allOf: [
      { $ref: '#/components/schemas/HotspotBase' },
      { required: ['building_id', 'name', 'type'] },
    ],
  },
  Hotspot: {
    allOf: [
      {
        type: 'object',
        properties: {
          id:           { type: 'integer',  example: 7 },
          is_active:    { type: 'boolean',  example: true },
          created_by:   { type: 'integer',  example: 1 },
          created_at:   { type: 'string',   format: 'date-time' },
          updated_at:   { type: 'string',   format: 'date-time' },
          building_name:{ type: 'string',   example: 'Bloque Académico A' },
          building_code:{ type: 'string',   example: 'FIE-A' },
        },
      },
      { $ref: '#/components/schemas/HotspotBase' },
    ],
  },

  // ─── Building ────────────────────────────────────────────────────────────
  Building: {
    type: 'object',
    properties: {
      id:          { type: 'integer', example: 1 },
      name:        { type: 'string',  example: 'Bloque Académico A' },
      code:        { type: 'string',  example: 'FIE-A' },
      description: { type: 'string',  example: 'Edificio principal de aulas' },
      is_active:   { type: 'boolean', example: true },
      created_at:  { type: 'string',  format: 'date-time' },
    },
  },

  // ─── Model ───────────────────────────────────────────────────────────────
  Model3D: {
    type: 'object',
    properties: {
      id:          { type: 'integer', example: 1 },
      building_id: { type: 'integer', example: 1 },
      filename:    { type: 'string',  example: 'fie_main.glb' },
      url:         { type: 'string',  example: '/models/fie_main.glb' },
      is_active:   { type: 'boolean', example: true },
      created_at:  { type: 'string',  format: 'date-time' },
    },
  },

  // ─── Image ───────────────────────────────────────────────────────────────
  HotspotImage: {
    type: 'object',
    properties: {
      id:          { type: 'integer', example: 3 },
      hotspot_id:  { type: 'integer', example: 7 },
      url:         { type: 'string',  example: '/uploads/lab-redes-01.jpg' },
      alt_text:    { type: 'string',  example: 'Vista del laboratorio de redes' },
      order_index: { type: 'integer', example: 0 },
      created_at:  { type: 'string',  format: 'date-time' },
    },
  },

  // ─── Admin User ──────────────────────────────────────────────────────────
  AdminUser: {
    type: 'object',
    properties: {
      id:              { type: 'integer', example: 1 },
      full_name:       { type: 'string',  example: 'María García' },
      email:           { type: 'string',  format: 'email', example: 'mgarcia@espoch.edu.ec' },
      role:            { type: 'string',  enum: ['admin','superadmin'] },
      is_active:       { type: 'boolean', example: true },
      failed_attempts: { type: 'integer', example: 0 },
      last_login:      { type: 'string',  format: 'date-time', nullable: true },
      created_at:      { type: 'string',  format: 'date-time' },
    },
  },
  AdminUserCreate: {
    type: 'object',
    required: ['full_name', 'email', 'password', 'role'],
    properties: {
      full_name:{ type: 'string', example: 'María García' },
      email:    { type: 'string', format: 'email', example: 'mgarcia@espoch.edu.ec' },
      password: { type: 'string', format: 'password', example: 'Secure$Pass2026!' },
      role:     { type: 'string', enum: ['admin','superadmin'], example: 'admin' },
    },
  },

  // ─── Audit Log ───────────────────────────────────────────────────────────
  AuditLog: {
    type: 'object',
    properties: {
      id:           { type: 'integer', example: 42 },
      admin_name:   { type: 'string',  example: 'María García' },
      admin_email:  { type: 'string',  example: 'mgarcia@espoch.edu.ec' },
      action:       { type: 'string',  enum: ['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','ACTIVATE','DEACTIVATE'], example: 'CREATE' },
      entity_type:  { type: 'string',  example: 'hotspots', nullable: true },
      entity_id:    { type: 'integer', example: 7, nullable: true },
      old_values:   { type: 'object',  example: { name: 'Lab Redes A', is_active: true }, nullable: true },
      new_values:   { type: 'object',  example: { name: 'Lab Redes B', is_active: true }, nullable: true },
      created_at:   { type: 'string',  format: 'date-time' },
      ip_dec:       { type: 'string',  example: '192.168.1.100', nullable: true, description: 'IP descifrada con AES-256' },
      agent_dec:    { type: 'string',  example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', nullable: true },
    },
  },

  // ─── Errores genéricos ───────────────────────────────────────────────────
  Error400: {
    type: 'object',
    properties: { error: { type: 'string', example: 'El campo "name" es obligatorio.' } },
  },
  Error401: {
    type: 'object',
    properties: { error: { type: 'string', example: 'No autenticado. Token requerido.' } },
  },
  Error403: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Acceso restringido a superadministradores.' } },
  },
  Error404: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Hotspot no encontrado.' } },
  },
  Error423: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Cuenta bloqueada. Intenta en 30 minutos.' } },
  },
  Error500: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Error interno del servidor.' } },
  },
};

// ── Respuestas de error reutilizables ──────────────────────────────────────
const errRef = (code) => ({ $ref: `#/components/schemas/Error${code}` });

// ── Spec principal ─────────────────────────────────────────────────────────
const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'FIE Explorer 3D — API REST',
    version: '1.0.0',
    description: `
## Documentación de la API REST — FIE Explorer 3D (ESPOCH)

Esta API provee todos los endpoints necesarios para el visor 3D público y el panel
de administración del proyecto FIE Explorer 3D de la Escuela de Ingeniería en Sistemas (EIS), ESPOCH.

### Autenticación
Los endpoints marcados con 🔒 **Bearer** requieren un JWT válido enviado como **cookie HttpOnly** \`token\`
(establecida automáticamente al hacer \`POST /api/auth/login\`).
Para pruebas en Swagger UI, pega el valor del JWT en el campo \`bearerAuth\`.

### Niveles de acceso
| Rol | Permisos |
|---|---|
| **admin** | CRUD de hotspots, edificios, modelos, imágenes |
| **superadmin** | Todo lo anterior + gestión de usuarios admin y configuración del sistema |

### Tiempos de respuesta
Todos los endpoints están optimizados para responder en ≤ 500 ms bajo carga normal.
    `.trim(),
    contact: {
      name:  'FIE Explorer 3D — ESPOCH',
      email: 'soporte@espoch.edu.ec',
    },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Desarrollo local' },
    { url: 'https://fie-explorer.espoch.edu.ec', description: 'Producción' },
  ],
  tags: [
    { name: 'Auth',          description: 'Autenticación JWT con bloqueo progresivo y bcrypt 12' },
    { name: 'Hotspots',      description: 'CRUD completo de puntos de interés (hotspots) 3D' },
    { name: 'Buildings',     description: 'Listado y edición de edificios del campus FIE' },
    { name: 'Models',        description: 'Gestión de modelos 3D (.glb) por edificio' },
    { name: 'Images',        description: 'Imágenes asociadas a hotspots' },
    { name: 'Admin Users',   description: 'Gestión de usuarios administradores (solo superadmin)' },
    { name: 'Audit Logs',    description: 'Registro de auditoría con IPs y agentes cifrados con AES-256' },
    { name: 'Encryption',    description: 'Verificación del cifrado AES-256 en base de datos' },
    { name: 'Settings',      description: 'Configuración del sistema (límites de roles, parámetros de login)' },
    { name: 'Health',        description: 'Estado del servidor' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'JWT obtenido en POST /api/auth/login. En producción se envía automáticamente como cookie HttpOnly.',
      },
      cookieAuth: {
        type: 'apiKey',
        in:   'cookie',
        name: 'token',
        description: 'Cookie HttpOnly establecida por POST /api/auth/login.',
      },
    },
    schemas,
  },
  paths: {
    // ── Health ──────────────────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags:    ['Health'],
        summary: 'Estado del servidor',
        description: 'Verifica que la API está activa. No requiere autenticación.',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'Servidor activo',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                status:    { type: 'string', example: 'ok' },
                project:   { type: 'string', example: 'FIE Explorer 3D' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            }}},
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    '/api/auth/login': {
      post: {
        tags:        ['Auth'],
        summary:     'Iniciar sesión (obtener JWT)',
        description: `
Autentica al administrador con email y contraseña.
- Contraseñas hasheadas con **bcrypt 12 rondas**.
- Tras **N intentos fallidos** (configurable en system_config) la cuenta se bloquea por 30 minutos.
- En éxito, establece una **cookie HttpOnly** \`token\` con el JWT firmado.
        `.trim(),
        operationId: 'login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Login exitoso — cookie HttpOnly establecida',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          400: { description: 'Email o contraseña ausentes', content: { 'application/json': { schema: errRef(400) } } },
          401: { description: 'Credenciales incorrectas',   content: { 'application/json': { schema: errRef(401) } } },
          423: { description: 'Cuenta bloqueada',           content: { 'application/json': { schema: errRef(423) } } },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags:        ['Auth'],
        summary:     'Cerrar sesión',
        description: 'Elimina la cookie HttpOnly `token` y registra la acción en audit_logs.',
        operationId: 'logout',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Sesión cerrada', content: { 'application/json': { schema: {
            type: 'object', properties: { message: { type: 'string', example: 'Sesión cerrada.' } },
          }}}},
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags:        ['Auth'],
        summary:     'Datos del administrador autenticado',
        operationId: 'me',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Datos del admin actual',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },

    // ── Hotspots ────────────────────────────────────────────────────────────
    '/api/hotspots': {
      get: {
        tags:        ['Hotspots'],
        summary:     'Listar todos los hotspots (público)',
        description: 'Devuelve todos los hotspots con nombre e identificador del edificio. No requiere autenticación (el visor 3D lo usa).',
        operationId: 'listHotspots',
        responses: {
          200: { description: 'Lista de hotspots',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Hotspot' } } } } },
          500: { description: 'Error interno', content: { 'application/json': { schema: errRef(500) } } },
        },
      },
      post: {
        tags:        ['Hotspots'],
        summary:     'Crear un hotspot 🔒',
        description: 'Crea un nuevo punto de interés. Registra la acción en audit_logs con IP cifrada.',
        operationId: 'createHotspot',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/HotspotCreate' } } },
        },
        responses: {
          201: { description: 'Hotspot creado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotspot' } } } },
          400: { description: 'Datos inválidos',  content: { 'application/json': { schema: errRef(400) } } },
          401: { description: 'No autenticado',   content: { 'application/json': { schema: errRef(401) } } },
          500: { description: 'Error interno',    content: { 'application/json': { schema: errRef(500) } } },
        },
      },
    },
    '/api/hotspots/{id}': {
      get: {
        tags:        ['Hotspots'],
        summary:     'Obtener un hotspot por ID (público)',
        operationId: 'getHotspot',
        parameters: [{
          name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 7 },
          description: 'ID del hotspot',
        }],
        responses: {
          200: { description: 'Hotspot encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotspot' } } } },
          404: { description: 'No encontrado', content: { 'application/json': { schema: errRef(404) } } },
        },
      },
      put: {
        tags:        ['Hotspots'],
        summary:     'Actualizar un hotspot 🔒',
        description: 'Actualiza los campos enviados. Los omitidos conservan su valor anterior (COALESCE).',
        operationId: 'updateHotspot',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 7 },
        }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/HotspotBase' } } },
        },
        responses: {
          200: { description: 'Hotspot actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotspot' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          404: { description: 'No encontrado',  content: { 'application/json': { schema: errRef(404) } } },
        },
      },
      delete: {
        tags:        ['Hotspots'],
        summary:     'Eliminar un hotspot 🔒',
        operationId: 'deleteHotspot',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 7 },
        }],
        responses: {
          200: { description: 'Hotspot eliminado',
            content: { 'application/json': { schema: {
              type: 'object', properties: { message: { type: 'string', example: 'Hotspot "Lab Redes" eliminado correctamente.' } },
            }}}},
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          404: { description: 'No encontrado',  content: { 'application/json': { schema: errRef(404) } } },
        },
      },
    },
    '/api/hotspots/{id}/toggle': {
      patch: {
        tags:        ['Hotspots'],
        summary:     'Activar / desactivar un hotspot 🔒',
        description: 'Invierte el valor de `is_active` y registra la acción ACTIVATE o DEACTIVATE en audit_logs.',
        operationId: 'toggleHotspot',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 7 },
        }],
        responses: {
          200: { description: 'Estado actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Hotspot' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          404: { description: 'No encontrado',  content: { 'application/json': { schema: errRef(404) } } },
        },
      },
    },

    // ── Buildings ────────────────────────────────────────────────────────────
    '/api/buildings': {
      get: {
        tags:        ['Buildings'],
        summary:     'Listar edificios (público)',
        operationId: 'listBuildings',
        responses: {
          200: { description: 'Lista de edificios',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Building' } } } } },
        },
      },
    },
    '/api/buildings/{id}': {
      put: {
        tags:        ['Buildings'],
        summary:     'Actualizar un edificio 🔒',
        operationId: 'updateBuilding',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 },
        }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              name:        { type: 'string', example: 'Bloque Académico A' },
              description: { type: 'string', example: 'Edificio principal de aulas' },
              is_active:   { type: 'boolean', example: true },
            },
          }}},
        },
        responses: {
          200: { description: 'Edificio actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Building' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          404: { description: 'No encontrado',  content: { 'application/json': { schema: errRef(404) } } },
        },
      },
    },

    // ── Models ───────────────────────────────────────────────────────────────
    '/api/models': {
      get: {
        tags:        ['Models'],
        summary:     'Listar modelos 3D disponibles (público)',
        operationId: 'listModels',
        responses: {
          200: { description: 'Lista de modelos',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Model3D' } } } } },
        },
      },
      post: {
        tags:        ['Models'],
        summary:     'Registrar un modelo 3D 🔒',
        operationId: 'createModel',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['building_id', 'filename', 'url'],
            properties: {
              building_id: { type: 'integer', example: 1 },
              filename:    { type: 'string',  example: 'fie_main.glb' },
              url:         { type: 'string',  example: '/models/fie_main.glb' },
            },
          }}},
        },
        responses: {
          201: { description: 'Modelo registrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Model3D' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/models/{id}': {
      put: {
        tags:        ['Models'],
        summary:     'Actualizar un modelo 3D 🔒',
        operationId: 'updateModel',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              filename:  { type: 'string',  example: 'fie_main_v2.glb' },
              url:       { type: 'string',  example: '/models/fie_main_v2.glb' },
              is_active: { type: 'boolean', example: true },
            },
          }}},
        },
        responses: {
          200: { description: 'Modelo actualizado' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
      delete: {
        tags:        ['Models'],
        summary:     'Eliminar un modelo 3D 🔒',
        operationId: 'deleteModel',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          200: { description: 'Modelo eliminado' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },

    // ── Images ───────────────────────────────────────────────────────────────
    '/api/images/hotspot/{hotspotId}': {
      get: {
        tags:        ['Images'],
        summary:     'Listar imágenes de un hotspot 🔒',
        operationId: 'listImagesByHotspot',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'hotspotId', in: 'path', required: true,
          schema: { type: 'integer', example: 7 },
          description: 'ID del hotspot',
        }],
        responses: {
          200: { description: 'Lista de imágenes',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/HotspotImage' } } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/images': {
      post: {
        tags:        ['Images'],
        summary:     'Añadir imagen a un hotspot 🔒',
        operationId: 'createImage',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['hotspot_id', 'url'],
            properties: {
              hotspot_id:  { type: 'integer', example: 7 },
              url:         { type: 'string',  example: '/uploads/lab-redes-01.jpg' },
              alt_text:    { type: 'string',  example: 'Vista del laboratorio' },
              order_index: { type: 'integer', example: 0 },
            },
          }}},
        },
        responses: {
          201: { description: 'Imagen añadida',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HotspotImage' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/images/{id}': {
      put: {
        tags:        ['Images'],
        summary:     'Actualizar imagen 🔒',
        operationId: 'updateImage',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 3 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              url:         { type: 'string' },
              alt_text:    { type: 'string' },
              order_index: { type: 'integer' },
            },
          }}},
        },
        responses: {
          200: { description: 'Imagen actualizada' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
      delete: {
        tags:        ['Images'],
        summary:     'Eliminar imagen 🔒',
        operationId: 'deleteImage',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 3 } }],
        responses: {
          200: { description: 'Imagen eliminada' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },

    // ── Admin Users ──────────────────────────────────────────────────────────
    '/api/admin-users': {
      get: {
        tags:        ['Admin Users'],
        summary:     'Listar usuarios administradores 🔒 (solo superadmin)',
        operationId: 'listAdminUsers',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Lista de administradores',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdminUser' } } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          403: { description: 'Requiere rol superadmin', content: { 'application/json': { schema: errRef(403) } } },
        },
      },
      post: {
        tags:        ['Admin Users'],
        summary:     'Crear usuario administrador 🔒 (solo superadmin)',
        description: 'La contraseña se hashea con bcrypt 12. Si se supera el límite de roles configurado, la BD lanza error.',
        operationId: 'createAdminUser',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminUserCreate' } } },
        },
        responses: {
          201: { description: 'Usuario creado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminUser' } } } },
          400: { description: 'Datos inválidos',  content: { 'application/json': { schema: errRef(400) } } },
          401: { description: 'No autenticado',   content: { 'application/json': { schema: errRef(401) } } },
          403: { description: 'Requiere superadmin', content: { 'application/json': { schema: errRef(403) } } },
          422: { description: 'Contraseña débil', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              error:          { type: 'string', example: 'La contraseña no cumple los requisitos.' },
              passwordErrors: { type: 'array', items: { type: 'string' } },
            },
          }}}},
        },
      },
    },
    '/api/admin-users/{id}/toggle': {
      patch: {
        tags:        ['Admin Users'],
        summary:     'Activar / desactivar administrador 🔒 (solo superadmin)',
        operationId: 'toggleAdminUser',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 2 } }],
        responses: {
          200: { description: 'Estado actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminUser' } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          403: { description: 'Requiere superadmin', content: { 'application/json': { schema: errRef(403) } } },
        },
      },
    },
    '/api/admin-users/{id}/reset-password': {
      patch: {
        tags:        ['Admin Users'],
        summary:     'Resetear contraseña de un administrador 🔒 (solo superadmin)',
        operationId: 'resetAdminPassword',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 2 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['new_password'],
            properties: { new_password: { type: 'string', format: 'password', example: 'NewPass$2026!' } },
          }}},
        },
        responses: {
          200: { description: 'Contraseña reseteada' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          403: { description: 'Requiere superadmin', content: { 'application/json': { schema: errRef(403) } } },
        },
      },
    },

    // ── Audit Logs ───────────────────────────────────────────────────────────
    '/api/audit-logs': {
      get: {
        tags:        ['Audit Logs'],
        summary:     'Listar registros de auditoría 🔒',
        description: 'Devuelve logs con IPs y agentes cifrados con AES-256 (pgcrypto). Se descifran en Node.js por fila.',
        operationId: 'listAuditLogs',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [
          { name: 'limit',  in: 'query', schema: { type: 'integer', example: 100, maximum: 500 }, description: 'Máximo registros (default 100, máx 500)' },
          { name: 'action', in: 'query', schema: { type: 'string',  enum: ['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','ACTIVATE','DEACTIVATE'] }, description: 'Filtrar por acción' },
        ],
        responses: {
          200: { description: 'Registros de auditoría',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 42 },
                data:  { type: 'array', items: { $ref: '#/components/schemas/AuditLog' } },
              },
            }}}},
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },

    // ── Encryption ───────────────────────────────────────────────────────────
    '/api/encryption/audit-evidence': {
      get: {
        tags:        ['Encryption'],
        summary:     'Evidencia de cifrado en audit_logs 🔒',
        description: 'Muestra hasta 20 registros con columnas BYTEA crudas y sus valores descifrados para demostrar el cifrado AES-256.',
        operationId: 'auditEvidence',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Evidencia de cifrado AES-256 en audit_logs' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/encryption/error-evidence': {
      get: {
        tags:        ['Encryption'],
        summary:     'Evidencia de cifrado en error_logs 🔒',
        operationId: 'errorEvidence',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Evidencia de cifrado AES-256 en error_logs' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/encryption/sql-examples': {
      get: {
        tags:        ['Encryption'],
        summary:     'Ejemplos SQL para pgAdmin 4 🔒',
        description: 'Devuelve consultas SQL listas para pegar en pgAdmin 4 y verificar el cifrado directamente en la base de datos.',
        operationId: 'sqlExamples',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Consultas SQL de verificación' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },

    // ── Settings ─────────────────────────────────────────────────────────────
    '/api/settings/role-limits': {
      get: {
        tags:        ['Settings'],
        summary:     'Obtener límites de roles 🔒',
        description: 'Límites configurables de cuántos admins y superadmins puede haber en el sistema.',
        operationId: 'getRoleLimits',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Límites actuales de roles' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/settings/role-limits/{role}': {
      put: {
        tags:        ['Settings'],
        summary:     'Actualizar límite de un rol 🔒 (solo superadmin)',
        operationId: 'updateRoleLimit',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'role', in: 'path', required: true,
          schema: { type: 'string', enum: ['admin','superadmin'] },
        }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['max_count'],
            properties: { max_count: { type: 'integer', example: 5 } },
          }}},
        },
        responses: {
          200: { description: 'Límite actualizado' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/settings/config': {
      get: {
        tags:        ['Settings'],
        summary:     'Obtener toda la configuración del sistema 🔒',
        description: 'Incluye parámetros de login: max_attempts, lockout_minutes, lockout_warning_from.',
        operationId: 'getAllConfig',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          200: { description: 'Configuración completa del sistema' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
    '/api/settings/config/{key}': {
      put: {
        tags:        ['Settings'],
        summary:     'Actualizar un parámetro de configuración 🔒 (solo superadmin)',
        operationId: 'updateConfig',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'key', in: 'path', required: true,
          schema: { type: 'string', example: 'login.max_attempts' },
          description: 'Clave de configuración (ej: login.max_attempts, login.lockout_minutes)',
        }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'string', example: '5' } },
          }}},
        },
        responses: {
          200: { description: 'Configuración actualizada' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
          403: { description: 'Requiere superadmin', content: { 'application/json': { schema: errRef(403) } } },
        },
      },
    },
    '/api/settings/config/{key}/reset': {
      post: {
        tags:        ['Settings'],
        summary:     'Restaurar valor por defecto de un parámetro 🔒 (solo superadmin)',
        operationId: 'resetConfig',
        security:    [{ bearerAuth: [] }, { cookieAuth: [] }],
        parameters: [{
          name: 'key', in: 'path', required: true,
          schema: { type: 'string', example: 'login.max_attempts' },
        }],
        responses: {
          200: { description: 'Valor restaurado al default' },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errRef(401) } } },
        },
      },
    },
  },
};

// ── Opciones de UI ─────────────────────────────────────────────────────────
const swaggerUiOptions = {
  customSiteTitle: 'FIE Explorer 3D — API Docs',
  customCss: `
    .topbar { background-color: #003087 !important; }
    .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><text y="28" font-size="20" fill="white" font-family="Arial" font-weight="bold">FIE Explorer 3D</text></svg>'); height: 36px; }
    .swagger-ui .info .title { color: #003087; }
    .swagger-ui .btn.authorize { background-color: #003087; border-color: #003087; }
    .swagger-ui .opblock.opblock-get    .opblock-summary { border-color: #0ea5e9; }
    .swagger-ui .opblock.opblock-post   .opblock-summary { border-color: #22c55e; }
    .swagger-ui .opblock.opblock-put    .opblock-summary { border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-patch  .opblock-summary { border-color: #a855f7; }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = { swaggerUi, swaggerSpec, swaggerUiOptions };
