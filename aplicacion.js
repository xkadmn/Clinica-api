const db = require('./db');
const bcrypt = require('bcryptjs');  
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'tu_secreto_muy_seguro';

exports.login = function (usuarioData, res) {
  const { usuario, pass } = usuarioData;
  if (!usuario || !pass) {
    return res.status(400).json({ mensaje: 'Usuario y contraseña son obligatorios' });
  }

  const sql = `
    SELECT 
      u.id, u.usuario, u.nombre, u.apellido, u.fecnac, u.mail, u.tipo, u.pass,
      p.telefono1, p.telefono2, p.documento_tipo, p.documento_id, p.foto_perfil,
      p.direccion, p.localidad, p.nacionalidad, p.legajo_id
    FROM Usuario u
    LEFT JOIN Perfil p ON u.id = p.id
    WHERE u.usuario = ?
  `;

  db.query(sql, [usuario], (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error interno del servidor' });
    if (!resultados.length) return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const found = resultados[0];
    if (!bcrypt.compareSync(pass, found.pass)) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const payload = { id: found.id, rol: found.tipo, nombre: found.nombre, apellido: found.apellido };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });

    res.json({
      token,
      id: found.id,
      tipo: found.tipo,
      usuario: found.usuario,
      nombre: found.nombre,
      apellido: found.apellido,
      fecnac: found.fecnac,
      mail: found.mail,
      perfil: {
        telefono1: found.telefono1,
        telefono2: found.telefono2,
        documento_tipo: found.documento_tipo,
        documento_id: found.documento_id,
        foto_perfil: found.foto_perfil,
        direccion: found.direccion,
        localidad: found.localidad,
        nacionalidad: found.nacionalidad,
        legajo_id: found.legajo_id
      }
    });
  });
};

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
// usa bcrypt.compareSync para comparar pass vs hash
function validarUsuario(datos, usuario) {
    for (let i = 0; i < datos.length; i++) {
        const element = datos[i];
        if (
            element.usuario === usuario.usuario &&
            bcrypt.compareSync(usuario.pass, element.pass)  
        ) {
            return element;
        }
    }
    return null;
}

exports.insertar = function(usuario, res) {
    console.log('Datos de usuario a insertar:', usuario);
    const hashedPass = bcrypt.hashSync(usuario.pass, 10);

    const aprobado = usuario.tipo === '2' ? false : true;
    const sqlUsuario = `
        INSERT INTO Usuario 
          (nombre, apellido, fecnac, usuario, pass, mail, tipo, aprobado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valuesUsuario = [
        usuario.nombre,
        usuario.apellido,
        usuario.fecnac,
        usuario.usuario,
        hashedPass,        
        usuario.mail,
        usuario.tipo,
        aprobado
    ];

    db.query(sqlUsuario, valuesUsuario, (err, resultado) => {
        if (err) {
            console.error('Error al insertar usuario:', err);
            return res.status(500).json({ success: false, message: 'Error al insertar usuario' });
        }
    
        const nuevoId = resultado.insertId;
        res.json({ success: true, message: 'Usuario insertado correctamente', id: nuevoId });
    });
};


exports.insertarPerfil = function(perfilData, usuarioId, res) {
    if (!perfilData || !usuarioId) {
        return res.status(400).json({ success: false, message: 'Datos de perfil o ID de usuario no proporcionados.' });
    }
    const values = [
        usuarioId, 
        perfilData.telefono1 || null, 
        perfilData.telefono2 || null,
        perfilData.documento_tipo || null,
        perfilData.documento_id || null,
        perfilData.mail || null,
        perfilData.foto_perfil || null,
        perfilData.direccion || null,
        perfilData.localidad || null,
        perfilData.nacionalidad || null,
        perfilData.legajo_id || null ,
        perfilData.obraSocial || null
    ];
    console.log('Datos a insertar perfil:', values);
    const sql = `
      INSERT INTO Perfil 
        (id, telefono1, telefono2, documento_tipo, documento_id, mail, foto_perfil, direccion, localidad, nacionalidad, legajo_id, obra_social) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, values, (err, resultado) => {
        if (err) {
            console.error('Error al insertar perfil:', err);
            res.status(500).json({ success: false, message: 'Error al insertar perfil' });
        } else {
            res.json({ success: true, message: 'Perfil insertado correctamente' });
        }
    });
};

exports.insertarFichaMedica = function(fichaData, usuarioId, res) {
    const sql = `INSERT INTO ficha-medico (id_medico, formacion, experiencia, certificaciones, idiomas, area-atencion) VALUES (?, ?,?,?,?,?)`;
    const values = [usuarioId, fichaData.datos_medicos];
    db.query(sql, values, (err, resultado) => {
        if (err) {
            console.error('Error al insertar ficha médica:', err);
            res.status(500).json({ success: false, message: 'Error al insertar ficha médica' });
        } else {
            res.json({ success: true, message: 'Ficha médica insertada correctamente' });
        }
    });
}


exports.insertarEspecialidades = function (medicoId, especialidades, res) {
    const sql = `INSERT INTO Especialidad_Medico (id_medico, id_especialidad) VALUES (?, ?)`;
    const insertPromises = especialidades.map(especialidadId => {
        return new Promise((resolve, reject) => {
            db.query(sql, [medicoId, especialidadId], (err, resultado) => {
                if (err) {
                    console.error('Error al insertar especialidad:', err);
                    return reject(err);
                }
                resolve(resultado);
            });
        });
    });

    Promise.all(insertPromises)
        .then(() => res.json({ success: true, message: 'Especialidades insertadas correctamente' }))
        .catch(err => res.status(500).json({ success: false, message: 'Error al insertar especialidades' }));
}


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

exports.aprobarMedico = function(req, res) {
  const id = req.params.id;
  const aprobado = req.body.aprobado ? 1 : 0;
  const sql = 'UPDATE Usuario SET aprobado = ? WHERE id = ?';
  db.query(sql, [aprobado, id], (err, resultado) => {
    if (err) {
      console.error('Error al actualizar aprobación del médico:', err);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Médico no encontrado' });
    }
    res.json({ success: true, message: 'Estado de aprobación actualizado correctamente' });
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
    db.obtenerEspecialidades((err, resultado) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, resultado);
        }
    });
};

exports.obtenerMedicosPorEspecialidad = function(especialidadId, res) {
    const sql = `
        SELECT U.id AS medico_id, U.nombre, U.apellido 
        FROM Usuario AS U 
        JOIN Especialidad_Medico AS EM ON U.id = EM.id_medico
        WHERE EM.id_especialidad = ? AND U.aprobado = true
    `;
    
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
       p.legajo_id,
       p.obra_social AS obraSocial

FROM Usuario u 
JOIN Perfil p ON u.id = p.id
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

exports.obtenerTurnosMedicoPorSemana = function(medicoId, startDate, _endDate, res) {
  // startDate debe venir formateado "YYYY-MM-DD" y representar un lunes
  const sql = `
    SELECT
      id,
      usuario_medico_id   AS medicoId,
      especialidad_id     AS especialidadId,
      fecha,
      hora,
      disponible,
      usuario_paciente_id AS pacienteId
    FROM Turno
    WHERE usuario_medico_id = ?
      AND fecha >= ?
      AND fecha <= DATE_ADD(?, INTERVAL 6 DAY)
    ORDER BY fecha, hora
  `;
  // pasamos startDate dos veces: una para >= y otra para calcular +6 días
  db.query(sql, [medicoId, startDate, startDate], (err, turnos) => {
    if (err) {
      console.error('Error al obtener turnos semanales:', err);
      return res.status(500).json({ mensaje: 'Error al obtener turnos' });
    }
    res.json(turnos);
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
      t.id,
      t.usuario_medico_id      AS medicoId,
      CONCAT(u.nombre,' ',u.apellido) AS medicoNombre,
      t.especialidad_id        AS especialidadId,
      e.nombre                 AS especialidadNombre,
      t.fecha,
      t.hora,
      t.disponible,
      t.usuario_paciente_id    AS pacienteId,
      t.puntuacion,            -- <-- agregado
      t.comentario             -- <-- agregado
    FROM Turno t
    JOIN Usuario u  ON u.id = t.usuario_medico_id
    JOIN Especialidad e ON e.id = t.especialidad_id
    WHERE t.usuario_paciente_id = ?
    ORDER BY t.fecha ASC, t.hora ASC
  `;
  db.query(sql, [pacienteId], (err, turnos) => {
    if (err) {
      console.error('Error al obtener turnos del paciente:', err);
      return res.status(500).json({ message: 'Error al obtener turnos del paciente' });
    }
    res.json(turnos);
  });
};

exports.eliminarTurno = function(turnoId, res) {
    db.query('DELETE FROM Turno WHERE id = ?', [turnoId], (err, resultado) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al eliminar el turno' });
        if (resultado.affectedRows === 0) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        res.json({ success: true, message: 'Turno eliminado correctamente' });
    });
};

exports.cancelarTurno = function(turnoId, res) {
    db.query('UPDATE Turno SET disponible = 3 WHERE id = ?', [turnoId], (err, resultado) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al cancelar el turno' });
        if (resultado.affectedRows === 0) return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        res.json({ success: true, message: 'Turno cancelado correctamente' });
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
            foto_perfil = COALESCE(?, foto_perfil),
            direccion = ?, 
            localidad = ?, 
            nacionalidad = ?, 
            legajo_id = ? ,
            obra_social = ?
        WHERE id = ?`;

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
        perfilData.obraSocial,
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

exports.insertarTurno = function(turnos, res) {
  db.insertarTurnos(turnos, (err, resultado) => {
    if (err) {
      console.error('Error al insertarTurnos:', err);
      return res.status(500).json({ mensaje: 'Error al insertar turnos' });
    }
    res.json(resultado);
  });
};

exports.obtenerTurnosMedicoPorSemanaPublic = function(medicoId, especialidadId, startDate, endDate, res) {
  const sql = `
    SELECT *
    FROM Turno
    WHERE usuario_medico_id = ?
      AND (? IS NULL OR especialidad_id = ?)
      AND fecha >= ?
      AND fecha <= DATE_ADD(?, INTERVAL 6 DAY)
    ORDER BY fecha, hora
  `;
  db.query(sql, [medicoId, especialidadId, especialidadId, startDate, startDate], (err, turnos) => {
    if (err) {
      console.error('Error al obtener turnos semanales:', err);
      return res.status(500).json({ mensaje: 'Error al obtener turnos' });
    }
    res.json(turnos);
  });
};

exports.cancelarTurnoPaciente = function(turnoId, res) {
    const sql = 'UPDATE Turno SET disponible = 1, usuario_paciente_id = NULL WHERE id = ?';

    db.query(sql, [turnoId], (err, resultado) => {
        if (err) {
            console.error('Error al cancelar turno por paciente:', err);
            return res.status(500).json({ success: false, message: 'Error al cancelar turno' });
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }
        res.json({ success: true, message: 'Turno cancelado por paciente correctamente' });
    });
};

exports.puntuarTurno = function(turnoId, data, res) {
  const { puntuacion, comentario } = data;
  const sql = 'UPDATE Turno SET puntuacion = ?, comentario = ? WHERE id = ?';
  db.query(sql, [puntuacion, comentario || null, turnoId], (err, result) => {
    if (err) return res.status(500).json({ success:false, message:'Error al puntuar' });
    if (result.affectedRows === 0) return res.status(404).json({ success:false, message:'Turno no encontrado' });
    res.json({ success:true, message:'Turno puntuado correctamente' });
  });
};

exports.getEstadisticasMedico = function(medicoId, callback) {
  const sqlStats = `
    SELECT 
      AVG(puntuacion) AS avgRating,
      COUNT(*) AS totalRatings
    FROM Turno
    WHERE usuario_medico_id = ?
  `;
  const sqlComentarios = `
    SELECT t.puntuacion,
           t.comentario,
           t.fecha,
           e.nombre AS especialidad
    FROM Turno t
    JOIN Especialidad e ON t.especialidad_id = e.id
    WHERE t.usuario_medico_id = ?
      AND t.puntuacion IS NOT NULL
    ORDER BY t.fecha DESC
    LIMIT 20
  `;

  db.query(sqlStats, [medicoId], (err, statsRows) => {
    if (err) return callback(err);

    // Aquí tomamos el avg y el total desde statsRows
    const avgRaw   = statsRows[0]?.avgRating   ?? 0;
    const totalRaw = statsRows[0]?.totalRatings ?? 0;

    // Si quieres redondear a 2 decimales pero manteniendo un número:
    const avg = parseFloat(Number(avgRaw).toFixed(2));
    const total = totalRaw;

    db.query(sqlComentarios, [medicoId], (err2, comments) => {
      if (err2) return callback(err2);

      const result = {
        avgRating: avg,
        totalRatings: total,
        evaluations: comments
      };
      callback(null, result);
    });
  });
};