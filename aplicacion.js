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
    const sqlUsuario = `INSERT INTO Usuario (nombre, apellido, fecnac, usuario, pass, mail, tipo, aprobado) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const valuesUsuario = [usuario.nombre, usuario.apellido, usuario.fecnac, usuario.usuario, usuario.pass, usuario.mail, usuario.tipo, aprobado];

    db.query(sqlUsuario, valuesUsuario, (err, resultado) => {
        if (err) {
            console.error('Error al insertar usuario:', err);
            res.status(500).json({ success: false, message: 'Error al insertar usuario' });
        } else {
            console.log('Usuario insertado correctamente:', resultado);
            const nuevoId = resultado.insertId; // Obtener el ID del nuevo usuario

            // Ahora insertar el perfil
            const perfil = usuario.perfil; // Asumiendo que el perfil viene en el objeto usuario
            const sqlPerfil = `INSERT INTO Perfil (id_perfil, telefono1, telefono2, direccion, localidad, nacionalidad, documento_tipo, documento_id, mail, foto_perfil) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const valuesPerfil = [nuevoId, perfil.telefono1, perfil.telefono2, perfil.direccion, perfil.localidad, perfil.nacionalidad, perfil.documento_tipo, perfil.documento_id, perfil.mail, perfil.foto_perfil];

            db.query(sqlPerfil, valuesPerfil, (errPerfil, resultadoPerfil) => {
                if (errPerfil) {
                    console.error('Error al insertar perfil:', errPerfil);
                    res.status(500).json({ success: false, message: 'Error al insertar perfil' });
                } else {
                    console.log('Perfil insertado correctamente:', resultadoPerfil);
                    
                    // Si es un médico, insertar ficha médica y especialidades
                    if (usuario.tipo === '2') {
                        const fichaMedica = usuario.fichaMedica; 
                        const sqlFichaMedica = `INSERT INTO ficha_medico (id_medico, experiencia, certificaciones, idiomas, area_atencion) 
                                                VALUES (?, ?, ?, ?, ?)`;
                        const valuesFichaMedica = [nuevoId, fichaMedica.experiencia, fichaMedica.certificaciones, fichaMedica.idiomas, fichaMedica.area_atencion];

                        db.query(sqlFichaMedica, valuesFichaMedica, (errFicha, resultadoFicha) => {
                            if (errFicha) {
                                console.error('Error al insertar ficha médica:', errFicha);
                                res.status(500).json({ success: false, message: 'Error al insertar ficha médica' });
                            } else {
                                console.log('Ficha médica insertada correctamente:', resultadoFicha);

                                // Ahora insertar especialidades
                                const especialidades = usuario.especialidades; 
                                const sqlEspecialidadMedico = `INSERT INTO Especialidad_Medico (id_medico, id_especialidad) VALUES (?, ?)`;

                                // Insertar cada especialidad
                                const queries = especialidades.map(id_especialidad => {
                                    return new Promise((resolve, reject) => {
                                        db.query(sqlEspecialidadMedico, [nuevoId, id_especialidad], (errEspecialidad) => {
                                            if (errEspecialidad) {
                                                return reject(errEspecialidad);
                                            }
                                            resolve();
                                        });
                                    });
                                });

                                Promise.all(queries)
                                    .then(() => {
                                        res.json({ success: true, message: 'Usuario, perfil, ficha médica y especialidades insertados correctamente' });
                                    })
                                    .catch(err => {
                                        console.error('Error al insertar especialidades:', err);
                                        res.status(500).json({ success: false, message: 'Error al insertar especialidades' });
                                    });
                            }
                        });
                    } else {
                        res.json({ success: true, message: 'Usuario y perfil insertados correctamente' });
                    }
                }
            });
        }
    });
};


// Función para insertar perfil
exports.insertarPerfil = function(perfil, callback) {
    const sql = `INSERT INTO Perfil (id_perfil, telefono1, telefono2, direccion, localidad, nacionalidad, documento_tipo, documento_id, mail, foto_perfil) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [perfil.id, perfil.telefono1, perfil.telefono2, perfil.direccion, perfil.localidad, perfil.nacionalidad, perfil.documento_tipo, perfil.documento_id, perfil.mail, perfil.foto_perfil];

    db.query(sql, values, (err, resultado) => { // Cambia 'query' a 'db.query'
        if (err) {
            console.error('Error al insertar perfil:', err);
            callback({ success: false, message: 'Error al insertar perfil' });
        } else {
            console.log('Perfil insertado correctamente:', resultado);
            callback({ success: true, message: 'Perfil insertado correctamente' });
        }
    });
};



// Función para insertar ficha médica
exports.insertarFichaMedica = function(fichaData, res) {
    const sql = `INSERT INTO ficha_medico (id_medico, experiencia, certificaciones, idiomas, area_atencion) 
                 VALUES (?, ?, ?, ?, ?)`;
    const values = [fichaData.id_medico, fichaData.experiencia, fichaData.certificaciones, fichaData.idiomas, fichaData.area_atencion];

    db.query(sql, values, (err, resultado) => {
        if (err) {
            console.error('Error al insertar ficha médica:', err);
            res.status(500).json({ success: false, message: 'Error al insertar ficha médica' });
        } else {
            console.log('Ficha médica insertada correctamente:', resultado);
            res.json({ success: true, message: 'Ficha médica insertada correctamente' });
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
exports.obtenerTurnosPorDia = function(medicoId, especialidadId, fecha, res) {
    const sql = `SELECT * FROM Turno WHERE usuario_medico_id = ? AND especialidad_id = ? AND fecha = ?`;
    
    db.query(sql, [medicoId, especialidadId, fecha], (err, turnos) => {
        if (err) {
            console.error('Error al obtener turnos por día:', err);
            res.status(500).json({ message: 'Error al obtener turnos por día' });
        } else {
            res.json(turnos);
        }
    });
};

exports.actualizarTurno = function(id, usuario_paciente_id, disponible, callback) {
    const sql = 'UPDATE Turno SET usuario_paciente_id = ?, disponible = ? WHERE id = ?';
    
    db.query(sql, [usuario_paciente_id, disponible, id], (err, resultado) => {
        if (err) {
            console.error('Error al actualizar el turno:', err);
            return callback(err, null);
        }
        
        if (resultado.affectedRows > 0) {
            callback(null, { message: 'Turno actualizado correctamente' });
        } else {
            callback(null, { message: 'Turno no encontrado' });
        }
    });
};

exports.obtenerTurnosPorPaciente = function(pacienteId, res) {
    const sql = `
        SELECT 
            T.id, 
            T.usuario_medico_id,
            T.fecha, 
            T.hora, 
            T.disponible 
        FROM 
            Turno T 
        WHERE 
            T.usuario_paciente_id = ?`;

    db.query(sql, [pacienteId], (err, turnos) => {
        if (err) {
            console.error('Error al obtener turnos del paciente:', err);
            res.status(500).json({ message: 'Error al obtener turnos del paciente' });
        } else {
            res.json(turnos);
        }
    });
};

exports.actualizarPerfil = function(usuarioId, perfilData, res) {
    const sql = `
        UPDATE Perfil 
        SET 
            telefono1 = ?, 
            telefono2 = ?, 
            documento_tipo = ?, 
            documento_id = ?, 
            mail = ?, 
            foto_perfil = ?, 
            direccion = ?, 
            localidad = ?, 
            nacionalidad = ?, 
            legajo_id = ? 
        WHERE id_perfil = ?`;

    const values = [
        perfilData.telefono1,
        perfilData.telefono2,
        perfilData.documento_tipo,
        perfilData.documento_id,
        perfilData.mail,
        perfilData.foto_perfil,
        perfilData.direccion,
        perfilData.localidad,
        perfilData.nacionalidad,
        perfilData.legajo_id,
        usuarioId
    ];

    db.query(sql, values, (err, resultado) => {
        if (err) {
            console.error('Error al actualizar perfil:', err);
            res.status(500).json({ success: false, message: 'Error al actualizar perfil' });
        } else if (resultado.affectedRows === 0) {
            res.status(404).json({ success: false, message: 'Perfil no encontrado' });
        } else {
            res.json({ success: true, message: 'Perfil actualizado correctamente' });
        }
    });
};
