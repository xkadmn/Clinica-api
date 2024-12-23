const express = require('express');
const cors = require('cors');
const aplicacion = require('./aplicacion');
const db = require('./db');
const app = express();

// Middleware
app.use(cors());

app.use(express.json());

// Rutas
app.get('/prueba', (req, res) => {
    res.send("Hola mundo");
});

app.get('/pruebajson', (req, res) => {
    res.json({ mensaje: 'Hola pruebajson' });
});

// Endpoint para manejar login
app.post('/login', (req, res) => {
    const usuario = req.body;
    console.log('Usuario recibido en /login:', usuario);
    aplicacion.leer(usuario, res);
});
// Endpoint para traer ultimo id usuario creado
app.get('/ultimo-id', (req, res) => {
    const sql = 'SELECT id FROM Usuario ORDER BY id DESC LIMIT 1';
    db.query(sql, (err, resultados) => {
        if (err) {
            console.error('Error al obtener el último ID:', err);
            return res.status(500).json({ message: 'Error al obtener el último ID' });
        }
        const ultimoId = resultados.length > 0 ? resultados[0].id : 0; // Devuelve 0 si no hay usuarios
        res.json(ultimoId);
    });
});

// Endpoint para insertar usuario
app.post('/insertar', (req, res) => {
    const usuario = req.body;
    aplicacion.insertar(usuario, res);
});

// Endpoint para insertar perfil
app.post('/insertarperfil/:usuarioId', (req, res) => {
    const perfilData = req.body;
    const usuarioId = req.params.usuarioId; 
    aplicacion.insertarPerfil(perfilData, usuarioId, res); 
});
// Endpoint para insertar ficha médica
app.post('/ficha-medica', (req, res) => {
    const fichaData = req.body;
    aplicacion.insertarFichaMedica(fichaData, res);
});
// Endpoint para insertar especialidades
app.post('/insertar-especialidades', (req, res) => {
    const { medicoId, especialidades } = req.body;
    if (!medicoId || !Array.isArray(especialidades) || especialidades.length === 0) {
        return res.status(400).json({ success: false, message: 'Datos incompletos o incorrectos' });
    }
    insertarEspecialidades(medicoId, especialidades, res);
});

// Endpoint para obtener médicos pendientes de aprobación
app.get('/medicos-pendientes', (req, res) => {
    aplicacion.obtenerMedicosPendientes(res);
});

// Endpoint para aprobar un médico específico
app.put('/aprobar-medico/:id', (req, res) => {
    const id = req.params.id;
   const aprobado = req.body.aprobado;

    aplicacion.aprobarMedico(id, aprobado, (err, resultado) => {
        if (err) {
            console.error('Error al actualizar el estado de aprobación del médico:', err);
            return res.status(500).json({ message: 'Error al actualizar el estado de aprobación del médico' });
        }
        res.json(resultado);
    });
});

// Endpoint para obtener todas las especialidades
app.get('/especialidades/', (req, res) => {
    aplicacion.obtenerEspecialidades((err, resultado) => {
        if (err) {
            console.error('Error en el endpoint /especialidades:', err);
            res.status(500).json({ message: 'Error al obtener especialidades', error: err });
        } else {
            res.json(resultado);
        }
    });
});

// Endpoint para obtener médicos por especialidad
app.get('/medicos-por-especialidad/:especialidadId', (req, res) => {
    var especialidadId = req.params.especialidadId;
    aplicacion.obtenerMedicosPorEspecialidad(especialidadId, res);
});


//  médicos 
app.get('/medicos', (req, res) => {
    const especialidadId = req.query.especialidad;
    if (!especialidadId) {
        return res.status(400).json({ message: 'Especialidad ID is required' });
    }
    aplicacion.obtenerMedicosPorEspecialidad(especialidadId, (err, resultado) => {
        if (err) {
            console.error('Error al obtener médicos por especialidad:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        res.json(resultado);
    });
});

app.get('/medico/:id/especialidades', (req, res) => {
    const medicoId = req.params.id;
    aplicacion.obtenerEspecialidadesMedico(medicoId, (err, especialidades) => {
        if (err) {
            console.error('Error al obtener especialidades de médico:', err);
            return res.status(500).json({ message: 'Error interno al obtener especialidades de médico 01' });
        }

        if (!especialidades || especialidades.length === 0) {
            return res.status(404).json({ message: 'No se encontraron especialidades para el médico especificado 02' });
        }

        res.json(especialidades);
    });
});

app.post('/api/turnos', (req, res) => {
    const turnos = req.body;
    console.log('Datos de los turnos recibidos:', turnos);

    // Verificar si los datos no son null
    for (const turno of turnos) {
        if (!turno.medicoId || !turno.especialidadId || !turno.fecha || !turno.hora || turno.disponible === undefined) {
            return res.status(400).json({ success: false, message: 'Datos del turno incompletos o incorrectos' });
        }
    }

    db.insertarTurnos(turnos, (err, resultado) => {
        if (err) {
            console.error('Error al insertar turno:', err);
            return res.status(500).json({ success: false, message: 'Error al insertar turno' });
        }
        res.json(resultado);
    });
});

app.get('/api/verturnos', (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
  
    db.query('SELECT * FROM Turno WHERE fecha BETWEEN ? AND ?', [startDate, endDate], (err, turnos) => {
      if (err) {
        console.error('Error al obtener turnos:', err);
        return res.status(500).json({ message: 'Error al obtener turnos' });
      }
      res.json(turnos);
    });
  });

 


app.get('/todos-los-medicos', (req, res) => {
    aplicacion.obtenerTodosLosMedicos(res); 
});

// Endpoint para obtener médicos aprobados
app.get('/medicos-aprobados', (req, res) => {
    aplicacion.obtenerMedicosAprobados(res);
});

// Endpoint para obtener el perfil de un usuario por su ID
app.get('/perfil/:id', (req, res) => {
    const usuarioId = req.params.id;
    aplicacion.obtenerPerfilPorId(usuarioId, res);
});


app.get('/turnos/:medicoId', (req, res) => {
    const medicoId = req.params.medicoId;
    const { especialidadId, fechaInicio, fechaFin } = req.query;

    aplicacion.obtenerturnosmedicoporsemana(medicoId, especialidadId, fechaInicio, fechaFin, res);
});

app.get('/turnos/:medicoId/:especialidadId/:fecha', (req, res) => {
    const medicoId = req.params.medicoId;
    const especialidadId = req.params.especialidadId;
    const fecha = req.params.fecha;

    aplicacion.obtenerTurnosPorDia(medicoId, especialidadId, fecha, res);
});

app.put('/turnos/:id', (req, res) => {
    const { id } = req.params;
    const { usuario_paciente_id, disponible } = req.body;

    aplicacion.actualizarTurno(id, usuario_paciente_id, disponible, (err, resultado) => {
        if (err) {
            console.error('Error al actualizar el turno:', err);
            return res.status(500).send({ message: 'Error interno del servidor' });
        }
        res.status(200).send(resultado);
    });
});


app.get('/turnos/pacienteId/:id', (req, res) => {
    const pacienteId = req.params.id; 
    aplicacion.obtenerTurnosPorPaciente(pacienteId, res); 
});

app.delete('/eliminarturno/:id', (req, res) => {
    const turnoId = parseInt(req.params.id, 10);
    aplicacion.eliminarTurno(turnoId, res);
});

app.put('/cancelarturno/:id', (req, res) => {
    const turnoId = parseInt(req.params.id, 10);
    aplicacion.cancelarTurno(turnoId, res);
});

app.put('/perfil/:id', (req, res) => {
    const usuarioId = req.params.id;
    const perfilData = req.body;

    aplicacion.actualizarPerfil(usuarioId, perfilData, res);
});

const PORT = process.env.PORT || 7200;
app.listen(PORT, () => {
    console.log(`Escuchando en el puerto ${PORT}`);
});