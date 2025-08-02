const mysql = require('mysql');


const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'mysql.db.mdbgo.com',
    user: 'hkoo_usuariosclinica',
    password: 'Clinica1234.',
    database: 'hkoo_usuarios',
    port: 3306,
});

// Función para realizar consultas
function query(sql, args, callback) {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error al obtener conexión del pool:', err);
            return callback(err);
        }
        connection.query(sql, args, (err, rows) => {
            connection.release(); // Liberar la conexión para que vuelva al pool
            if (err) {
                console.error('Error en la consulta SQL:', err);
                return callback(err);
            }
            callback(null, rows);
        });
    });
}

// Función para insertar turnos
function insertarTurnos(turnos, callback) {
    const sql = `INSERT INTO Turno (usuario_medico_id, especialidad_id, fecha, hora, disponible) 
                 VALUES (?, ?, ?, ?, ?)`;

    turnos.forEach((turno) => {
        pool.query(sql, [turno.medicoId, turno.especialidadId, turno.fecha, turno.hora, turno.disponible], (err, result) => {
            if (err) {
                console.error('Error al insertar turno:', err);
                callback(err, null);
            } else {
                console.log('Turno insertado correctamente:', result);
            }
        });
    });

    callback(null, { success: true, message: 'Turnos habilitados correctamente' });
}



// Exportar funciones
module.exports = {
    query: query,
    insertarTurnos: insertarTurnos,
    buscarPersonas: function(respuesta) {
        const sql = 'SELECT * FROM Usuario';
        query(sql, (err, resultado) => {
            if (err) {
                console.error('Error al buscar personas:', err);
                respuesta([]);
            } else {
                respuesta(resultado);
            }
        });
    },
    insertarPersona: function(usuario, callback) {
        const aprobado = usuario.tipo === '2' ? false : true;
        const sql = `INSERT INTO Usuario (nombre, apellido, fecnac, usuario, pass, mail, tipo, aprobado) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [usuario.nombre, usuario.apellido, usuario.fecNac, usuario.usuario, usuario.pass, usuario.mail, usuario.tipo, aprobado];

        query(sql, values, (err, resultado) => {
            if (err) {
                console.error('Error al insertar usuario:', err);
                callback({ success: false, message: 'Error al insertar usuario' });
            } else {
                console.log('Usuario insertado correctamente:', resultado);
                callback({ success: true, message: 'Usuario insertado correctamente' });
            }
        });
    },
    buscarMedicosPendientes: function(respuesta) {
        const sql = 'SELECT * FROM Usuario WHERE tipo = 2 AND aprobado = false';
        query(sql, (err, resultado) => {
            if (err) {
                console.error('Error al buscar médicos pendientes:', err);
                respuesta([]);
            } else {
                respuesta(resultado);
            }
        });
    },
    obtenerEspecialidades: function(callback) {
        const sql = 'SELECT * FROM Especialidad';
        query(sql, (err, resultado) => {
            if (err) {
                console.error("Error al obtener especialidades:", err);
                callback(err, null);
            } else {
                callback(null, resultado);
            }
        });
    },

  
};