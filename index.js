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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Pruebas públicas
app.get('/prueba', (req, res) => res.send('Hola mundo'));
app.get('/pruebajson', (req, res) => res.json({ mensaje: 'Hola pruebajson' }));

// LOGIN con JWT (pública)
app.post('/login', (req, res) => {
  const { usuario, pass } = req.body;
  db.query('SELECT * FROM Usuario WHERE usuario = ?', [usuario], (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error interno del servidor' });
    if (!resultados.length) return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    const found = resultados[0];
    if (!bcrypt.compareSync(pass, found.pass)) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }
    const payload = { id: found.id, rol: found.tipo };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    res.json({ token, usuario: found.usuario, tipo: found.tipo });
  });
});

//  Registro de usuario **público**, sin verificarToken
app.post('/insertar', (req, res) => {
  aplicacion.insertar(req.body, res);
});
// Registro de perfil PÚBLICO durante el flujo de registro
app.post('/insertarperfil/:usuarioId', (req, res) => {
  aplicacion.insertarPerfil(req.body, req.params.usuarioId, res);
});

app.post('/ficha-medica/:usuarioId', (req, res) => {
  aplicacion.insertarFichaMedica(req.body, req.params.usuarioId, res);
});

app.get('/especialidades', (req, res) => aplicacion.obtenerEspecialidades(res));



// Middleware para verificar JWT en rutas protegidas
function verificarToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ mensaje: 'Token no proporcionado' });
  const token = header.split(' ')[1];
  jwt.verify(token, SECRET, (err, payload) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    req.usuario = payload;
    next();
  });
}

app.get('/ultimo-id', verificarToken, (req, res) => {
  aplicacion.obtenerUltimoId(res);
});


app.get('/api/verturnos', verificarToken, (req, res) => aplicacion.verTurnos(res));
app.post('/api/turnos', verificarToken, (req, res) => aplicacion.insertarTurno(req.body, res));

app.get('/perfil/:id', verificarToken, (req, res) => aplicacion.obtenerPerfilPorId(req.params.id, res));
app.put('/perfil/:id', verificarToken, (req, res) => aplicacion.actualizarPerfil(req.params.id, req.body, res));

const PORT = process.env.PORT || 7200;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
