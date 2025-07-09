const express = require('express');
const cors = require('cors');
const aplicacion = require('./aplicacion');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'tu_secreto_muy_seguro';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas públicas de prueba
app.get('/prueba', (req, res) => {
  res.send('Hola mundo');
});
app.get('/pruebajson', (req, res) => {
  res.json({ mensaje: 'Hola pruebajson' });
});

// --- LOGIN con JWT ---
app.post('/login', (req, res) => {
  const { usuario, pass } = req.body;
  console.log('Intento de login:', usuario);

  // 1. Buscar usuario en la base de datos
  const sql = 'SELECT * FROM Usuario WHERE usuario = ?';
  db.query(sql, [usuario], (err, resultados) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }

    if (!resultados.length) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const found = resultados[0];
    // 2. Verificar contraseña con bcrypt
    if (!bcrypt.compareSync(pass, found.pass)) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // 3. Generar payload y firmar token (1h de expiración)
    const payload = { id: found.id, rol: found.tipo };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });

    // 4. Devolver token y datos básicos
    res.json({
      token,
      usuario: found.usuario,
      tipo: found.tipo
    });
  });
});

// Middleware para verificar JWT en rutas protegidas
function verificarToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ mensaje: 'Token no proporcionado' });

  const token = header.split(' ')[1]; // "Bearer <token>"
  jwt.verify(token, SECRET, (err, payload) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    req.usuario = payload; // { id, rol }
    next();
  });
}

// Resto de endpoints (algunos protegidos como ejemplo)
app.get('/ultimo-id', verificarToken, (req, res) => {
  aplicacion.obtenerUltimoId(res);
});

app.post('/insertar', verificarToken, (req, res) => {
  aplicacion.insertar(req.body, res);
});

app.post('/insertarperfil/:usuarioId', verificarToken, (req, res) => {
  aplicacion.insertarPerfil(req.body, req.params.usuarioId, res);
});

app.post('/ficha-medica', verificarToken, (req, res) => {
  aplicacion.insertarFichaMedica(req.body, res);
});

// Ejemplo de ruta pública para especialidades
app.get('/especialidades', (req, res) => aplicacion.obtenerEspecialidades(res));

// Turnos protegidos
app.get('/api/verturnos', verificarToken, (req, res) => aplicacion.verTurnos(res));
app.post('/api/turnos', verificarToken, (req, res) => aplicacion.insertarTurno(req.body, res));

// Perfil de usuario (cliente puede ver su propio perfil)
app.get('/perfil/:id', verificarToken, (req, res) => aplicacion.obtenerPerfilPorId(req.params.id, res));
app.put('/perfil/:id', verificarToken, (req, res) => aplicacion.actualizarPerfil(req.params.id, req.body, res));

// Iniciar servidor
const PORT = process.env.PORT || 7200;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
