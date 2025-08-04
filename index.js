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
app.post('/insertarperfil/:usuarioId', cpUpload, (req, res) => {
  const usuarioId = req.params.usuarioId;

  // 1. Validar perfil
  if (!req.body.perfil) {
    return res.status(400).json({ success: false, message: 'Datos de perfil faltantes.' });
  }

  let perfilData;
  try {
    perfilData = JSON.parse(req.body.perfil);
  } catch (e) {
    return res.status(400).json({ success: false, message: 'JSON inválido en perfil.' });
  }

  // 2. Adjuntar la foto si viene en el FormData
  if (req.files['foto_perfil'] && req.files['foto_perfil'][0]) {
    perfilData.foto_perfil = req.files['foto_perfil'][0].buffer;
  }

  // 3. Llamar a la función original
  aplicacion.insertarPerfil(perfilData, usuarioId, res);
});
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
    // 1) Validar que venga perfil
   let perfilData;
    if (req.body.perfil) {
      try {
        perfilData = JSON.parse(req.body.perfil);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'JSON inválido en perfil' });
      }
    } else {
      // express.json() ya puso tus campos directamente en req.body
      perfilData = req.body;
    }

    // 2) Si subieron foto_perfil, extraer correctamente
    const fotoField = req.files['foto_perfil'];
    if (fotoField && fotoField.length > 0) {
      perfilData.foto_perfil = fotoField[0].buffer;
    }

    // 3) Llamar al método de actualización
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

// Lista todos los médicos (tipo=2)
app.get('/todos-los-medicos', verificarToken, (req, res) =>
  aplicacion.obtenerTodosLosMedicos(res)
);

// Lista médicos pendientes (aprobado = false)
app.get('/medicos-pendientes', verificarToken, (req, res) =>
  aplicacion.obtenerMedicosPendientes(res)
);

// Cambia estado de aprobación
app.put('/aprobar-medico/:id', verificarToken,
  aplicacion.aprobarMedico
);

app.put('/api/turnos/:id/puntuacion',
  verificarToken,
  (req, res) => aplicacion.puntuarTurno(req.params.id, req.body, res)
);


app.get(
  '/api/estadisticas/medico/:id',
  verificarToken,
  (req, res) => {
    const id = req.params.id;
    aplicacion.getEstadisticasMedico(id, (err, stats) => {
      if (err) {
        console.error('Error al obtener estadísticas:', err);
        return res.status(500).json({ error: 'Error interno' });
      }
      res.json(stats);
    });
  }
);

app.get('/medicos-aprobados', verificarToken,
  aplicacion.obtenerMedicosAprobados
);

app.get('/usuarios', verificarToken, (req, res) => {
  db.query('SELECT id, usuario, nombre, apellido, mail, tipo, aprobado FROM Usuario', [], (err, resultado) => {
    if (err) {
      console.error('Error al obtener todos los usuarios:', err);
      res.status(500).json({ message: 'Error al obtener usuarios' });
    } else {
      res.json(resultado);
    }
  });
});

app.put('/usuarios/:id/cambiarContrasena', verificarToken, (req, res) => {
  const userId = req.params.id;
  const { actual, nueva } = req.body;

  db.query('SELECT pass FROM Usuario WHERE id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error interno' });
    if (!rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const hashActual = rows[0].pass;
    const bcrypt = require('bcryptjs');

    // Validar contraseña actual
    if (!bcrypt.compareSync(actual, hashActual)) {
      return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña hasheada
    const nuevaHash = bcrypt.hashSync(nueva, 10);
    db.query('UPDATE Usuario SET pass = ? WHERE id = ?', [nuevaHash, userId], (err2) => {
      if (err2) return res.status(500).json({ mensaje: 'Error al actualizar contraseña' });
      res.json({ mensaje: 'Contraseña actualizada' });
    });
  });
});

const PORT = process.env.PORT || 10000; // Render asigna dinámico
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PORT}`));
