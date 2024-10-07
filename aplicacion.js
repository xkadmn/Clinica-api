const db = require('./db');

exports.leer = function(usuario, res) {
    db.query('SELECT * FROM Usuario', (err, datos) => {
        if (err) {
            console.error('Error al buscar personas:', err);
            res.status(500).json({ message: 'Error interno del servidor' });
        } else {
            const usuarioValidado = validarUsuario(datos, usuario);
            console.log('Resultado de validarUsuario:', usuarioValidado);
            res.json(usuarioValidado);
        }
    });
};

function validarUsuario(datos, usuario) {
    for (let i = 0; i < datos.length; i++) {
        const element = datos[i];
        if (element.usuario === usuario.usuario && element.pass === usuario.pass) {
            return element;
        }
    }
    return null;
}

exports.insertar = function(usuario, res) {
    const aprobado = usuario.tipo === '2' ? false : true;
    const sql = `INSERT INTO Usuario (nombre, apellido, fecnac, usuario, pass, mail, tipo, aprobado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [usuario.nombre, usuario.apellido, usuario.fecNac, usuario.usuario, usuario.pass, usuario.mail, usuario.tipo, aprobado];

    db.query(sql, values, (err, resultado) => {
        if (err) {
            console.error('Error al insertar usuario:', err);
            res.status(500).json({ success: false, message: 'Error al insertar usuario' });
        } else {
            console.log('Usuario insertado correctamente:', resultado);
            res.json({ success: true, message: 'Usuario insertado correctamente' });
        }
    });
};

exports.obtenerMedicosPendientes = function(res) {
    const sql = 'SELECT * FROM Usuario WHERE tipo = 2 AND aprobado = false';
    db.query(sql, (err, datos) => {
        if (err) {
            console.error('Error al buscar médicos pendientes:', err);
            res.status(500).json({ message: 'Error interno del servidor' });
        } else {
            res.json(datos);
        }
    });
};

exports.aprobarMedico = function(id, aprobado, callback) {
    const sql = 'UPDATE Usuario SET aprobado = ? WHERE id = ?';
    db.query(sql, [aprobado, id], (err, resultado) => {
        if (err) {
            console.error('Error al actualizar el estado de aprobación del médico:', err);
            callback(err, null);
        } else {
            console.log('Estado de aprobación del médico actualizado correctamente:', resultado);
            callback(null, { success: true, message: 'Estado de aprobación actualizado correctamente' });
        }
    });
};

exports.obtenerEspecialidadesMedico = function(medicoId, callback) {
    const query = `
        SELECT E.id, E.nombre 
        FROM Usuario U 
        JOIN Especialidad_Medico EM ON U.id = EM.id_medico 
        JOIN Especialidad E ON EM.id_especialidad = E.id 
        WHERE U.id = ?`;

    db.query(query, [medicoId], (err, resultado) => {
        if (err) {
            console.error(`01 Error al obtener especialidades de médico con ID ${medicoId}:`, err);
            callback(err, null);
        } else {
            console.log('02 Especialidades del médico obtenidas:', resultado);
            callback(null, resultado);
        }
    });
};

// Obtener todos los médicos
exports.obtenerTodosLosMedicos = function(res) {
    const sql = 'SELECT * FROM Usuario WHERE tipo = 2';
    db.query(sql, [], (err, resultado) => {
        if (err) {
            console.error('Error al obtener todos los médicos:', err);
            res.status(500).json({ message: 'Error al obtener todos los médicos' });
        } else {
            res.json(resultado);
        }
    });
};

// Obtener médicos aprobados SELECT * FROM Usuario WHERE tipo = 2 AND aprobado = true';
exports.obtenerMedicosAprobados = function(res) {
    const sql = 'SELECT * FROM Usuario WHERE tipo = 2 AND aprobado = true';
    db.query(sql, [], (err, resultado) => {
        if (err) {
            console.error('Error al obtener médicos aprobados:', err);
            res.status(500).json({ message: 'Error al obtener médicos aprobados' });
        } else {
            res.json(resultado);
        }
    });
};

exports.obtenerEspecialidades = function(callback) {
    db.obtenerEspecialidades(callback);
}

exports.obtenerMedicosPorEspecialidad = function(especialidadId, res) {
    const sql = `          
       SELECT U.id AS medico_id, U.nombre, U.apellido 
        FROM Usuario AS U 
        JOIN Especialidad_Medico AS EM ON U.id = EM.id_medico
        WHERE EM.id_especialidad = ? AND U.aprobado = true;` ;
    
    db.query(sql, [especialidadId], (err, resultado) => {
        if (err) {
            console.error('Error al obtener médicos por especialidad:', err);
            res.status(500).json({ message: 'Error al obtener médicos por especialidad' });
        } else {
            res.json(resultado);
        }
    });
};

exports.obtenerPerfilPorId = function(usuarioId, res) {
    const sql = `
        SELECT u.id, 
       u.nombre, 
       u.apellido, 
       u.fecnac, 
       u.mail, 
       p.telefono1, 
       p.telefono2, 
       p.documento_tipo, 
       p.documento_id, 
       p.foto_perfil, 
       p.direccion, 
       p.localidad, 
       p.nacionalidad, 
       p.legajo_id 
FROM Usuario u 
JOIN Perfil p ON u.id = p.id_perfil 
WHERE u.id = ?;`;

    db.query(sql, [usuarioId], (err, datos) => {
        if (err) {
            console.error('Error al obtener perfil por ID:', err);
            res.status(500).json({ message: 'Error interno del servidor' });
        } else if (datos.length === 0) {
            res.status(404).json({ message: 'Perfil no encontrado' });
        } else {
            res.json(datos[0]); // Retornamos solo el primer resultado
        }
    });
};

exports.obtenerturnosmedicoporsemana = function (medicoId, especialidadId, fechaInicio, fechaFin, res) {
    const sql = `SELECT * FROM Turno WHERE usuario_medico_id = ? AND especialidad_id = ? AND fecha BETWEEN ? AND ?`;
    
    db.query(sql, [medicoId, especialidadId, fechaInicio, fechaFin], (err, turnos) => {
        if (err) {
            console.error('Error al obtener turnos:', err);
            res.status(500).json({ message: 'Error al obtener turnos' });
        } else {
            res.json(turnos);
        }
    });
};