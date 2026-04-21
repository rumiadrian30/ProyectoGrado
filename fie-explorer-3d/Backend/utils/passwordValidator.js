// utils/passwordValidator.js
const RULES = [
  { id: 'length',    test: (p) => p.length >= 8,           msg: 'Mínimo 8 caracteres.'                         },
  { id: 'uppercase', test: (p) => /[A-Z]/.test(p),         msg: 'Al menos una letra mayúscula (A-Z).'           },
  { id: 'lowercase', test: (p) => /[a-z]/.test(p),         msg: 'Al menos una letra minúscula (a-z).'           },
  { id: 'number',    test: (p) => /[0-9]/.test(p),         msg: 'Al menos un número (0-9).'                     },
  { id: 'symbol',    test: (p) => /[^A-Za-z0-9]/.test(p),  msg: 'Al menos un símbolo especial (!@#$%^&*...).'   },
  { id: 'nospace',   test: (p) => !/\s/.test(p),            msg: 'No debe contener espacios.'                    },
];

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, errors: ['La contraseña debe ser texto.'] };
  }
  const errors = RULES.filter(r => !r.test(password)).map(r => r.msg);
  return { valid: errors.length === 0, errors };
}

module.exports = { validatePassword, RULES };
