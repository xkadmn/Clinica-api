const express = require('express');
const cors = require('cors');
const aplicacion = require('./aplicacion');
const db = require('./db');
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'tu_secreto_muy_seguro';
const multer  = require('multer');
const storage = multer.memoryStorage();    // guarda el archivo en memoria
const upload  = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // max 5 MB
const app = express();
const cpUpload = upload.fields([
  { name: 'perfil',      maxCount: 1 },   // tu JSON
  { name: 'foto_perfil', maxCount: 1 }    // la imagen
]);
// Middleware global
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

 
function verificarToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }
  const token = header.split(' ')[1];
  jwt.verify(token, SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    }
    req.usuario = payload;
    next();
  });
}

// Rutas públicas
app.get('/prueba', (req, res) => res.send('Hola mundo'));
app.get('/pruebajson', (req, res) => res.json({ mensaje: 'Hola pruebajson' }));

app.get('/localidades', (req, res) => {
  db.query('SELECT id, nombre, provincia FROM Localidad ORDER BY provincia, nombre', (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener localidades' });
    res.json(rows);
  });
});

app.post('/login', (req, res) => aplicacion.login(req.body, res));
app.post('/insertar', (req, res) => aplicacion.insertar(req.body, res));
app.post('/insertarperfil/:usuarioId', (req, res) => aplicacion.insertarPerfil(req.body, req.params.usuarioId, res));
app.post('/ficha-medica/:usuarioId', (req, res) => aplicacion.insertarFichaMedica(req.body, req.params.usuarioId, res));
app.get('/especialidades', (req, res) => {
    aplicacion.obtenerEspecialidades((err, resultado) => {
        if (err) {
            console.error("Error interno obteniendo especialidades:", err);
            return res.status(500).json({ mensaje: "Error interno obteniendo especialidades." });
        }
        res.json(resultado);
    });
});

// Rutas protegidas con JWT
app.get('/ultimo-id', verificarToken, (req, res) => aplicacion.obtenerUltimoId(res));
app.get('/api/verturnos', verificarToken, (req, res) => {
  const medicoId = req.usuario.id;
  const { startDate, endDate } = req.query;
  aplicacion.obtenerTurnosMedicoPorSemana(medicoId, startDate, endDate, res);
});

app.post('/api/turnos', verificarToken, (req, res) => aplicacion.insertarTurno(req.body, res));
app.put('/api/turnos/:id', (req, res) => {
    const { usuario_paciente_id, disponible } = req.body;

    aplicacion.actualizarTurno(
        req.params.id,
        usuario_paciente_id,
        disponible,
        (err, result) => {
            if (err) return res.status(500).json({ mensaje: 'Error al actualizar turno' });
            res.json(result);
        }
    );
});


app.get('/perfil/:id', verificarToken, (req, res) => aplicacion.obtenerPerfilPorId(req.params.id, res));

app.put('/perfil/:id',
  verificarToken,
  cpUpload,
  (req, res) => {
    let perfilData = JSON.parse(req.body.perfil);
    if (req.files['foto_perfil']) {
      // 1) Asigna el Buffer directamente
      perfilData.foto_perfil = req.files['foto_perfil'][0].buffer;
    }
    aplicacion.actualizarPerfil(req.params.id, perfilData, res);
  }
);

app.get('/medico/:id/especialidades', verificarToken, (req, res) => {
  const medicoId = req.params.id;
  aplicacion.obtenerEspecialidadesMedico(medicoId, (err, especialidades) => {
    if (err) {
      console.error(`Error al obtener especialidades del médico ${medicoId}:`, err);
      return res.status(500).json({ mensaje: 'Error interno al recuperar especialidades' });
    }
    res.json(especialidades);
  });
});

app.put('/cancelarturno/:id', verificarToken, (req, res) => {
  aplicacion.cancelarTurno(req.params.id, res);
});

app.delete('/eliminarturno/:id', verificarToken, (req, res) => {
  aplicacion.eliminarTurno(req.params.id, res);
});

app.get('/medicos-por-especialidad/:id', (req, res) => {
    aplicacion.obtenerMedicosPorEspecialidad(req.params.id, res);
});

app.get('/api/turnos/paciente/:id', verificarToken, (req, res) => {
    const pacienteId = req.params.id;
    aplicacion.obtenerTurnosPorPaciente(pacienteId, res);
});

app.get('/api/verturnos-medico', (req, res) => {
  const { medicoId, especialidadId, startDate, endDate } = req.query;
  if (!medicoId) {
    return res.status(400).json({ mensaje: 'medicoId es obligatorio' });
  }
  aplicacion.obtenerTurnosMedicoPorSemanaPublic(
      medicoId,
      especialidadId,
      startDate,
      endDate,
      res
  );
});

app.get('/api/turnos/mis-turnos', verificarToken, (req, res) => {
    const pacienteId = req.usuario.id;  // tomado del token
    aplicacion.obtenerTurnosPorPaciente(pacienteId, res);
});

app.put('/api/cancelarturno-paciente/:id', verificarToken, (req, res) => {
    aplicacion.cancelarTurnoPaciente(req.params.id, res);
});

const PORT = process.env.PORT || 7200;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
