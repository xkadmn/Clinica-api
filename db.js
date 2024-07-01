const mysql = require('mysql');
const db = require('./db');
const conexion = mysql.createConnection({
    host: 'mysql.db.mdbgo.com',
    user: 'hkoo_usuariosclinica',
    password: 'Clinica1234.',
    database: 'hkoo_usuarios',
    port: '',
});

function conectar() {
    conexion.connect(err => {
        if (err) {
            console.error('Error de conexión:', err);
            throw err;
        }
        console.log('Conexión exitosa');
    });
}
exports.conexion = conexion;
exports.conectar = conectar;

exports.buscarPersonas = function(respuesta) {
 conectar();
    conexion.query('SELECT * FROM Usuario', (err, resultado) => {
        if (err) {
            console.error('Error al buscar personas:', err);
            respuesta([]);
        }
        respuesta(resultado);
    });
};

exports.insertarPersona = function(usuario, callback) {
    //conectar();
    const aprobado = usuario.tipo === '2' ? false : true;
    const sql = `INSERT INTO Usuario (nombre, apellido, fecnac, usuario, pass, mail, tipo, aprobado) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                 console.log(usuario)
           

    conexion.query(sql, [usuario.nombre, usuario.apellido, usuario.fecNac, usuario.usuario, usuario.pass, usuario.mail, usuario.tipo, aprobado],
      (err, resultado) => {
        if (err) {
          console.error('Error al insertar usuario:', err);
          callback({ success: false, message: 'Error al insertar usuario' });
        } else {
          console.log('Usuario insertado correctamente:', resultado);
          callback({ success: true, message: 'Usuario insertado correctamente' });
        }
      }
    );
  };


exports.buscarMedicosPendientes = function(respuesta) {
    conexion.query('SELECT * FROM Usuario WHERE tipo = 2 AND aprobado = false', (err, resultado) => {
        if (err) {
            console.error('Error al buscar médicos pendientes:', err);
            respuesta([]);
        } else {
            respuesta(resultado);
        }
    });
};
exports.aprobarMedico = function(id, callback) {
   // conectar();
    conexion.query('UPDATE Usuario SET aprobado = true WHERE id = ?', [id], (err, resultado) => {
        if (err) {
            console.error('Error al aprobar médico:', err);
            callback({ success: false, message: 'Error al aprobar médico' });
        } else {
            console.log('Médico aprobado correctamente:', resultado);
            callback({ success: true, message: 'Médico aprobado correctamente' });
        }
    });
};

exports.obtenerEspecialidades = function(callback) {
    console.log('Obteniendo especialidades...');
    conexion.query("SELECT * FROM Especialidad", function(err, resultado) {
        if (err) {
            console.error('Error al obtener especialidades api:', err);
            callback(err, null);
        } else {
            console.log('Especialidades obtenidas:', resultado);
            callback(null, resultado);
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

    conexion.query(query, [medicoId], function(err, resultado) {
        if (err) {
            console.error('Error al obtener especialidades de médico:', err);
            callback(err, null);
        } else {
            console.log('Especialidades del médico obtenidas:', resultado);
            callback(null, resultado);
        }
    });
};

