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

// Endpoint para insertar usuario
app.post('/insertar', (req, res) => {
    const usuario = req.body;
    aplicacion.insertar(usuario, res);
});



// Endpoint para obtener médicos pendientes de aprobación
app.get('/medicos-pendientes', (req, res) => {
    aplicacion.obtenerMedicosPendientes(res);
});

// Endpoint para aprobar un médico específico
app.put('/aprobar-medico/:id', (req, res) => {
    const id = req.params.id;
    aplicacion.aprobarMedico(id, res);
});

// Endpoint para obtener todas las especialidades
app.get('/especialidades/', (req, res) => {
    console.log('Solicitud para obtener especialidades recibida');
    aplicacion.obtenerEspecialidades((err, resultado) => {
        if (err) {
            console.error('Error en el endpoint /especialidades:', err);
            res.status(500).json({ message: 'Error al obtener especialidades', error: err });
        } else {
            console.log('Especialidades enviadas al cliente:', resultado);
            res.json(resultado);
        }
    });
});

// Endpoint para obtener médicos por especialidad
app.get('/medicos-por-especialidad/:especialidadId', (req, res) => {
    var especialidadId = req.params.especialidadId;
    aplicacion.obtenerMedicosPorEspecialidad(especialidadId, res);
});


// Incluimos el endpoint /medicos para obtener médicos por especialidad
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

    // Aquí deberías llamar a la función adecuada para obtener las especialidades del médico por su ID
    db.obtenerEspecialidadesMedico(medicoId, (err, especialidades) => {
        if (err) {
            console.error('Error al obtener especialidades de médico:', err);
            return res.status(500).json({ message: 'Error interno al obtener especialidades de médico' });
        }

        if (!especialidades || especialidades.length === 0) {
            return res.status(404).json({ message: 'No se encontraron especialidades para el médico especificado' });
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

const PORT = process.env.PORT || 7200;
app.listen(PORT, () => {
    console.log(`Escuchando en el puerto ${PORT}`);
});