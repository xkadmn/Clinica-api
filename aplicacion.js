const db = require('./db');

exports.leer = function(usuario, res) {
    db.buscarPersonas(datos => {
        console.log('Datos obtenidos en leer:', datos);
        const usuarioValidado = validarUsuario(datos, usuario);
        console.log('Resultado de validarUsuario:', usuarioValidado);
        res.json(usuarioValidado);
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
    db.insertarPersona(usuario, resultado => {
        console.log('Resultado de inserción:', resultado);
        res.json(resultado);
    });
};

exports.obtenerMedicosPendientes = function(res) {
    db.buscarMedicosPendientes(datos => {
        res.json(datos);
    });
};



exports.aprobarMedico = function(id, res) {
    db.aprobarMedico(id, resultado => {
        res.json(resultado);
    });
};


exports.obtenerEspecialidadesMedico = function(req, res) {
    const medicoId = req.params.medicoId;

    db.obtenerEspecialidadesMedico(medicoId, (err, datos) => {
        if (err) {
            console.error('Error al obtener especialidades de médico en aplicacion.js:', err);
            res.status(500).json({ message: 'Error al obtener especialidades de médico', error: err });
        } else {
            console.log('Especialidades del médico enviadas al cliente:', datos);
            res.json(datos);
        }
    });
};