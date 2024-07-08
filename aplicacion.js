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

exports.aprobarMedico = function(id, res) {
    const sql = 'UPDATE Usuario SET aprobado = true WHERE id = ?';
    db.query(sql, [id], (err, resultado) => {
        if (err) {
            console.error('Error al aprobar médico:', err);
            res.status(500).json({ success: false, message: 'Error al aprobar médico' });
        } else {
            console.log('Médico aprobado correctamente:', resultado);
            res.json({ success: true, message: 'Médico aprobado correctamente' });
        }
    });
};

exports.obtenerEspecialidadesMedico = function(medicoId, callback) {
    const query = `
        SELECT E.id, E.nombre
        FROM Medico M
        JOIN Especialidades_Medico EM ON M.medico_id = EM.medico_id
        JOIN Especialidad E ON EM.especialidad_id = E.id
        WHERE M.usuario_id = ?`;

    db.query(query, [medicoId], (err, resultado) => {
        if (err) {
            console.error('Error al obtener especialidades de médico:', err);
            callback(err, null);
        } else {
            console.log('Especialidades del médico obtenidas:', resultado);
            callback(null, resultado);
        }
    });
};

/*/ función para obtener todos los médicos para aprobarmedicos.component.ts
exports.obtenerTodosLosMedicos = function(callback) {
    const sql = 'SELECT * FROM Usuario WHERE tipo = 2';
    db.query(sql, (err, resultado) => {
        if (err) {
            console.error('Error al obtener todos los médicos:', err);
            callback(err, null);
        } else {
            console.log('Todos los médicos obtenidos:', resultado);
            callback(null, resultado);
        }
    });
};*/

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