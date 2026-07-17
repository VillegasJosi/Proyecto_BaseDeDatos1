const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const dbConfig = {
    user: 'sa',
    password: 'Gatito1614.',
    server: 'localhost',
    database: 'Decarrerita',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// ==========================================
// 1. ENDPOINT: LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query(`
                SELECT C.id_usuario, C.correo, C.tipo_usuario, CH.estatus,
                       ISNULL(ev.nota_psicologica, 0) as nota_psicologica,
                       ISNULL(ev.nota_vehiculo, 0) as nota_vehiculo
                FROM usuarios.Cuentas C 
                LEFT JOIN usuarios.Choferes CH ON C.id_usuario = CH.id_chofer 
                OUTER APPLY (
                    SELECT TOP 1 nota_psicologica, nota_vehiculo 
                    FROM operaciones.Evaluaciones 
                    WHERE id_chofer = CH.id_chofer 
                    ORDER BY fecha_evaluacion DESC
                ) ev
                WHERE C.correo = @correo AND C.contrasena = @contrasena
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: "Correo o contraseña incorrectos." });
        }

        let usuario = result.recordset[0];

        // Devolvemos el objeto usuario completo incluyendo las notas del chofer
        res.json({
            success: true,
            usuario: {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                tipo_usuario: usuario.tipo_usuario,
                estatus: usuario.estatus || 'Pendiente',
                nota_psicologica: usuario.nota_psicologica, // <--- Agregado
                nota_vehiculo: usuario.nota_vehiculo       // <--- Agregado
            }
        });
    } catch (err) {
        console.error("Error en el login:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 2. ENDPOINT: REGISTRO DE CLIENTE
// ==========================================
app.post('/api/registro-cliente', async (req, res) => {
    const { nombre, apellido, cedula, telefono, correo, contrasena } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        let cuentaRes = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query(`INSERT INTO usuarios.Cuentas (correo, contrasena, tipo_usuario) 
                    OUTPUT INSERTED.id_usuario 
                    VALUES (@correo, @contrasena, 'Cliente')`);

        const newId = cuentaRes.recordset[0].id_usuario;

        await pool.request()
            .input('id_cliente', sql.Int, newId)
            .input('nombre', sql.VarChar, nombre)
            .input('apellido', sql.VarChar, apellido)
            .input('cedula', sql.VarChar, cedula)
            .input('telefono', sql.VarChar, telefono)
            .query(`INSERT INTO usuarios.Clientes (id_cliente, nombre, apellido, telefono, cedula, saldo_usuario)
                    VALUES (@id_cliente, @nombre, @apellido, @telefono, @cedula, 0.00)`);

        res.json({ success: true, message: "Cliente registrado." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 3. ENDPOINT: REGISTRO DE CHOFER
// ==========================================
app.post('/api/registro-chofer', async (req, res) => {
    const {
        nombre, apellido, cedula, telefono, correo, contrasena,
        marca, modelo, placa, color,
        contacto_emergencia1, telefono_emergencia1,
        contacto_emergencia2, telefono_emergencia2,
        id_banco, nro_cuenta
    } = req.body;

    try {
        let pool = await sql.connect(dbConfig);

        let cuentaRes = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query(`INSERT INTO usuarios.Cuentas (correo, contrasena, tipo_usuario) 
                    OUTPUT INSERTED.id_usuario 
                    VALUES (@correo, @contrasena, 'Chofer')`);

        const newId = cuentaRes.recordset[0].id_usuario;

        await pool.request()
            .input('id_chofer', sql.Int, newId)
            .input('nombre', sql.VarChar, nombre)
            .input('apellido', sql.VarChar, apellido)
            .input('telefono', sql.VarChar, telefono)
            .input('cedula', sql.VarChar, cedula)
            .input('id_banco', sql.Int, id_banco)
            .input('nro_cuenta', sql.VarChar, nro_cuenta)
            .input('c1', sql.VarChar, contacto_emergencia1)
            .input('t1', sql.VarChar, telefono_emergencia1)
            .input('c2', sql.VarChar, contacto_emergencia2)
            .input('t2', sql.VarChar, telefono_emergencia2)
            .query(`INSERT INTO usuarios.Choferes (id_chofer, nombre, apellido, telefono, cedula, id_banco, nro_cuenta, contacto_emergencia1, telefono_emergencia1, contacto_emergencia2, telefono_emergencia2, saldo_a_favor)
                    VALUES (@id_chofer, @nombre, @apellido, @telefono, @cedula, @id_banco, @nro_cuenta, @c1, @t1, @c2, @t2, 0.00)`);

        await pool.request()
            .input('id_chofer', sql.Int, newId)
            .input('marca', sql.VarChar, marca)
            .input('modelo', sql.VarChar, modelo)
            .input('placa', sql.VarChar, placa)
            .input('color', sql.VarChar, color)
            .query(`INSERT INTO operaciones.Vehiculos (id_chofer, marca, modelo, placa, color)
                    VALUES (@id_chofer, @marca, @modelo, @placa, @color)`);

        res.json({
            success: true,
            message: `¡Registro exitoso! Tu ID de chofer asignado es: #${newId}`,
            id_chofer: newId
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error al registrar: " + err.message });
    }
});

// ==========================================
// 4. ENDPOINT: EVALUAR POSTULANTE (ADMIN)
// ==========================================
// En tu endpoint del servidor (server.js):
app.post('/api/admin/evaluar-chofer', async (req, res) => {
    try {
        const { id_chofer, nota_psicologica, nota_vehiculo, id_banco, nro_cuenta } = req.body;

        const psico = parseInt(nota_psicologica);
        const veh = parseInt(nota_vehiculo);

        // Validar reglas estrictas: Psico >= 73 y Vehículo >= 65
        const esAprobadoPsico = psico >= 73 && psico <= 100;
        const esAprobadoVeh = veh >= 65 && veh <= 100;

        let estatusFinal = "";
        let mensajeRespuesta = "";

        if (esAprobadoPsico && esAprobadoVeh) {
            estatusFinal = 'Aprobado';
            mensajeRespuesta = "¡Evaluación registrada y chofer aprobado con éxito!";
        } else {
            estatusFinal = 'Rechazado';
            mensajeRespuesta = `❌ Lamentablemente tu postulación has sido REPROBADA por no cumplir con las calificaciones mínimas (Psico mín: 73 [Obtuvo: ${psico}], Vehículo mín: 65 [Obtuvo: ${veh}]).`;
        }

        const pool = await sql.connect(dbConfig);
        
        // 1. Buscamos el ID del vehículo asociado a este chofer (sea de la tabla oficial o de pendientes)
        let vehiculoQuery = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`
                SELECT TOP 1 id_vehiculo FROM operaciones.Vehiculos WHERE id_chofer = @id_chofer
                UNION
                SELECT TOP 1 id_postulacion as id_vehiculo FROM operaciones.VehiculosPendientes WHERE id_chofer = @id_chofer
            `);

        if (vehiculoQuery.recordset.length === 0) {
            return res.status(400).json({ success: false, error: "El chofer no tiene ningún vehículo registrado o pendiente para asociar la evaluación." });
        }

        const id_vehiculo_encontrado = vehiculoQuery.recordset[0].id_vehiculo;

        // 2. Actualizar el estatus general del chofer y sus datos bancarios opcionales
        await pool.request()
            .input('estatus', sql.VarChar, estatusFinal)
            .input('id_banco', sql.Int, id_banco || null)
            .input('nro_cuenta', sql.VarChar, nro_cuenta || '')
            .input('id_chofer', sql.Int, id_chofer)
            .query(`UPDATE usuarios.Choferes 
                    SET estatus = @estatus, 
                        id_banco = ISNULL(@id_banco, id_banco),
                        nro_cuenta = ISNULL(@nro_cuenta, nro_cuenta)
                    WHERE id_chofer = @id_chofer`);

        // 3. Registrar la evaluación incluyendo el id_vehiculo obligatorio
        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('id_vehiculo', sql.Int, id_vehiculo_encontrado)
            .input('nota_psicologica', sql.Int, psico)
            .input('nota_vehiculo', sql.Int, veh)
            .query(`INSERT INTO operaciones.Evaluaciones (id_chofer, id_vehiculo, nota_psicologica, nota_vehiculo, fecha_evaluacion) 
                    VALUES (@id_chofer, @id_vehiculo, @nota_psicologica, @nota_vehiculo, GETDATE())`);

        res.json({ success: true, message: mensajeRespuesta });

    } catch (error) {
        console.error("Error en evaluar-chofer:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// ==========================================
// 5. ENDPOINT: HISTORIAL DE RECARGAS CLIENTE
// ==========================================
app.get('/api/historial-recargas/:id', async (req, res) => {
    try {
        const idClienteInt = parseInt(req.params.id);
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('id', sql.Int, idClienteInt)
            .query(`SELECT r.fecha_recarga, r.monto, r.nro_referencia, b.nombre_banco 
                    FROM operaciones.Recargas r
                    INNER JOIN operaciones.Bancos b ON r.id_banco_origen = b.id_banco
                    WHERE r.id_cliente = @id 
                    ORDER BY r.fecha_recarga DESC`);

        res.json({ success: true, recargas: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 6. ENDPOINT: EJECUTAR RECARGA DE SALDO
// ==========================================
app.post('/api/recargar-saldo', async (req, res) => {
    const { id_cliente, monto, nro_referencia, banco } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        let bancoRes = await pool.request()
            .input('nombre_banco', sql.VarChar, banco)
            .query(`SELECT id_banco FROM operaciones.Bancos WHERE nombre_banco = @nombre_banco`);

        if (bancoRes.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'El banco seleccionado no existe.' });
        }

        const id_banco_origen = bancoRes.recordset[0].id_banco;

        await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('monto', sql.Decimal(18, 2), monto)
            .input('ref', sql.VarChar, nro_referencia)
            .input('id_banco_origen', sql.Int, id_banco_origen)
            .query(`INSERT INTO operaciones.Recargas (id_cliente, monto, fecha_recarga, nro_referencia, id_banco_origen)
                    VALUES (@id_cliente, @monto, GETDATE(), @ref, @id_banco_origen)`);

        let updateRes = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('monto', sql.Decimal(18, 2), monto)
            .query(`UPDATE usuarios.Clientes 
                    SET saldo_usuario = saldo_usuario + @monto 
                    OUTPUT INSERTED.saldo_usuario
                    WHERE id_cliente = @id_cliente`);

        res.json({ success: true, nuevoSaldo: updateRes.recordset[0].saldo_usuario });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 7. ENDPOINT: SOLICITAR TRASLADO
// ==========================================
app.post('/api/solicitar-traslado', async (req, res) => {
    const { id_cliente, origen, destino, distancia_km } = req.body;

    if (!id_cliente || !origen || !destino) {
        return res.status(400).json({ success: false, message: "Faltan datos obligatorios para el traslado." });
    }

    const km = parseFloat(distancia_km) || 5.00;
    const COSTO_TOTAL = 7.00;
    const GANANCIA_EMPRESA = COSTO_TOTAL * 0.30;
    const PAGO_CHOFER = COSTO_TOTAL * 0.70;

    let pool = await sql.connect(dbConfig);
    let transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        let clienteRes = await transaction.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query(`SELECT saldo_usuario FROM usuarios.Clientes WHERE id_cliente = @id_cliente`);

        if (clienteRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Cliente no encontrado." });
        }

        const saldoActual = clienteRes.recordset[0].saldo_usuario;
        if (saldoActual < COSTO_TOTAL) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Saldo insuficiente. El viaje cuesta $${COSTO_TOTAL.toFixed(2)} y posees $${saldoActual.toFixed(2)}.` });
        }

        let choferRes = await transaction.request()
            .query(`
                SELECT TOP 1 CH.id_chofer, CH.nombre, CH.apellido, V.id_vehiculo, V.marca, V.modelo, V.placa, V.color
                FROM operaciones.Evaluaciones E
                INNER JOIN usuarios.Choferes CH ON E.id_chofer = CH.id_chofer
                INNER JOIN operaciones.Vehiculos V ON E.id_vehiculo = V.id_vehiculo
                WHERE E.nota_psicologica >= 73 AND E.nota_vehiculo >= 65
                ORDER BY NEWID()
            `);

        if (choferRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "No hay choferes disponibles aprobados en el sistema." });
        }

        const choferAsignado = choferRes.recordset[0];

        let clienteUpdate = await transaction.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('costo', sql.Decimal(18, 2), COSTO_TOTAL)
            .query(`UPDATE usuarios.Clientes SET saldo_usuario = saldo_usuario - @costo 
                    OUTPUT INSERTED.saldo_usuario WHERE id_cliente = @id_cliente`);

        await transaction.request()
            .input('id_chofer', sql.Int, choferAsignado.id_chofer)
            .input('pago', sql.Decimal(18, 2), PAGO_CHOFER)
            .query(`UPDATE usuarios.Choferes SET saldo_a_favor = saldo_a_favor + @pago WHERE id_chofer = @id_chofer`);

        await transaction.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('id_chofer', sql.Int, choferAsignado.id_chofer)
            .input('id_vehiculo', sql.Int, choferAsignado.id_vehiculo)
            .input('punto_A', sql.VarChar, origen)
            .input('punto_B', sql.VarChar, destino)
            .input('distancia_km', sql.Decimal(5, 2), km)
            .input('costo_total', sql.Decimal(18, 2), COSTO_TOTAL)
            .input('ganancia_empresa', sql.Decimal(18, 2), GANANCIA_EMPRESA)
            .input('pago_chofer', sql.Decimal(18, 2), PAGO_CHOFER)
            .query(`INSERT INTO operaciones.Traslados 
                    (id_cliente, id_chofer, id_vehiculo, punto_A, punto_B, distancia_km, costo_total, ganancia_empresa, pago_chofer, fecha_traslado, estado_pago_chofer)
                    VALUES 
                    (@id_cliente, @id_chofer, @id_vehiculo, @punto_A, @punto_B, @distancia_km, @costo_total, @ganancia_empresa, @pago_chofer, GETDATE(), 'Pendiente')`);

        await transaction.commit();

        res.json({
            success: true,
            nuevoSaldoCliente: clienteUpdate.recordset[0].saldo_usuario,
            costoViaje: COSTO_TOTAL,
            chofer: choferAsignado
        });

    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// 8. ENDPOINTS ADMINISTRATIVOS Y FINANCIEROS
// ==========================================
app.get('/api/admin/reportes-financieros', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        let gananciaRes = await pool.query(`SELECT SUM(ganancia_empresa) AS total_ganancia FROM operaciones.Traslados`);
        let custodiaRes = await pool.query(`SELECT SUM(saldo_usuario) AS total_custodia FROM usuarios.Clientes`);

        res.json({
            success: true,
            totalGanancia: gananciaRes.recordset[0].total_ganancia || 0.00,
            totalCustodia: custodiaRes.recordset[0].total_custodia || 0.00
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/pagar-chofer', async (req, res) => {
    const { id_chofer, monto, nro_referencia } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        let choferRes = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`SELECT saldo_a_favor FROM usuarios.Choferes WHERE id_chofer = @id_chofer`);

        if (choferRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Chofer no encontrado en la base de datos." });
        }

        if (choferRes.recordset[0].saldo_a_favor < Number(monto)) {
            return res.status(400).json({ success: false, message: `Fondos insuficientes.` });
        }

        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('monto_pagado', sql.Decimal(18, 2), monto)
            .input('nro_referencia', sql.VarChar, nro_referencia)
            .query(`INSERT INTO operaciones.PagosChoferes (id_chofer, monto_pagado, fecha_pago, nro_referencia)
                    VALUES (@id_chofer, @monto_pagado, GETDATE(), @nro_referencia)`);

        let choferUpdate = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('monto', sql.Decimal(18, 2), monto)
            .query(`UPDATE usuarios.Choferes 
                    SET saldo_a_favor = saldo_a_favor - @monto 
                    OUTPUT INSERTED.saldo_a_favor
                    WHERE id_chofer = @id_chofer`);

        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`UPDATE operaciones.Traslados SET estado_pago_chofer = 'Cancelado' WHERE id_chofer = @id_chofer AND estado_pago_chofer = 'Pendiente'`);

        res.json({ success: true, nuevoSaldoChofer: choferUpdate.recordset[0].saldo_a_favor });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/pagos-chofer/:id', async (req, res) => {
    try {
        const id_chofer = req.params.id;
        const inicio = req.query.inicio || '2000-01-01';
        const fin = req.query.fin || '2099-12-31';

        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('inicio', sql.VarChar, inicio)
            .input('fin', sql.VarChar, fin)
            .query(`
                SELECT id_pago, monto_pagado, fecha_pago, nro_referencia 
                FROM operaciones.PagosChoferes 
                WHERE id_chofer = @id_chofer 
                  AND fecha_pago BETWEEN @inicio AND @fin
                ORDER BY fecha_pago DESC
            `);

        res.json({ success: true, pagos: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/deuda-chofer/:id', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        
        let resultResumen = await pool.request()
            .input('id_chofer', sql.Int, req.params.id)
            .query(`
                SELECT 
                    (SELECT SUM(ISNULL(pago_chofer, 0)) 
                     FROM operaciones.Traslados 
                     WHERE id_chofer = @id_chofer AND estado_pago_chofer = 'Pendiente') AS total_pendiente,
                    
                    (SELECT COUNT(id_traslado) 
                     FROM operaciones.Traslados 
                     WHERE id_chofer = @id_chofer) AS total_carreras
            `);

        let resultTraslados = await pool.request()
            .input('id_chofer', sql.Int, req.params.id)
            .query(`
                SELECT id_traslado AS id_viaje, fecha_traslado AS fecha, punto_A AS origen, punto_B AS destino, pago_chofer AS ganancia_chofer
                FROM operaciones.Traslados
                WHERE id_chofer = @id_chofer AND estado_pago_chofer = 'Pendiente'
            `);

        res.json({
            success: true,
            deudaTotal: resultResumen.recordset[0].total_pendiente || 0.00,
            totalCarreras: resultResumen.recordset[0].total_carreras || 0,
            traslados: resultTraslados.recordset
        });
    } catch (err) {
        console.error("🔥 ERROR DE SQL:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/vehiculos-pendientes', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const resultado = await pool.request().query(`
            SELECT id_postulacion AS id_vehiculo, id_chofer, marca, modelo, placa, color 
            FROM operaciones.VehiculosPendientes
        `);
        res.json({ success: true, vehiculos: resultado.recordset });
    } catch (err) {
        console.error("Error al obtener vehículos pendientes:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// --- ENDPOINT DEL ADMIN PARA CALIFICAR VEHÍCULO ---
app.put('/api/admin/aprobar-vehiculo/:id', async (req, res) => {
    const idPostulacion = req.params.id; // Corresponde al id de VehiculosPendientes
    const { nota_revision } = req.body;

    try {
        let notaNum = parseInt(nota_revision);
        if (isNaN(notaNum) || notaNum < 0 || notaNum > 100) {
            return res.status(400).json({ success: false, message: 'La calificación debe estar entre 0 y 100.' });
        }

        let pool = await sql.connect(dbConfig);

        // 1. Buscar el vehículo en VehiculosPendientes
        const pendienteRes = await pool.request()
            .input('id_post', sql.Int, idPostulacion)
            .query(`SELECT * FROM operaciones.VehiculosPendientes WHERE id_postulacion = @id_post`);

        if (pendienteRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Vehículo pendiente no encontrado.' });
        }

        const veh = pendienteRes.recordset[0];

        // 2. Insertarlo en la tabla oficial operaciones.Vehiculos
        const insertVehiculo = await pool.request()
            .input('id_chofer', sql.Int, veh.id_chofer)
            .input('marca', sql.VarChar, veh.marca)
            .input('modelo', sql.VarChar, veh.modelo)
            .input('placa', sql.VarChar, veh.placa)
            .input('color', sql.VarChar, veh.color)
            .query(`
                INSERT INTO operaciones.Vehiculos (id_chofer, marca, modelo, placa, color)
                OUTPUT INSERTED.id_vehiculo
                VALUES (@id_chofer, @marca, @modelo, @placa, @color)
            `);

        const nuevoIdVehiculo = insertVehiculo.recordset[0].id_vehiculo;

        // 3. Registrar la evaluación en operaciones.Evaluaciones
        await pool.request()
            .input('id_chofer', sql.Int, veh.id_chofer)
            .input('id_vehiculo', sql.Int, nuevoIdVehiculo)
            .input('nota_veh', sql.Int, notaNum)
            .query(`
                INSERT INTO operaciones.Evaluaciones (id_chofer, id_vehiculo, nota_psicologica, nota_vehiculo, fecha_evaluacion) 
                VALUES (@id_chofer, @id_vehiculo, 75, @nota_veh, GETDATE())
            `);

        // 4. Eliminar el registro de VehiculosPendientes para sacarlo de la lista de pendientes del admin
        await pool.request()
            .input('id_post', sql.Int, idPostulacion)
            .query(`DELETE FROM operaciones.VehiculosPendientes WHERE id_postulacion = @id_post`);

        res.json({ success: true, message: 'Vehículo aprobado y trasladado a la flota oficial exitosamente.' });

    } catch (err) {
        console.error("Error al aprobar vehículo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ==========================================
// 9. ENDPOINTS PERFIL Y GESTIÓN DE CHOFERES
// ==========================================
app.get('/api/chofer/perfil/:id', async (req, res) => {
    try {
        const id_chofer = req.params.id;
        const pool = await sql.connect(dbConfig);

        // 1. Obtener datos del chofer (Incluyendo nota_psicologica y nota_vehiculo de la evaluación)
        const queryChofer = `
            SELECT c.id_usuario, ch.nombre, ch.apellido, ch.cedula, ch.telefono, c.correo,
                   ISNULL(ch.saldo_a_favor, 0) as saldo_a_favor, b.nombre_banco as entidad_bancaria,
                   ch.nro_cuenta, ch.contacto_emergencia1, ch.telefono_emergencia1,
                   ch.contacto_emergencia2, ch.telefono_emergencia2,
                   ISNULL(ev.nota_psicologica, 0) as nota_psicologica, 
                   ISNULL(ev.nota_vehiculo, 0) as nota_vehiculo, 
                   ev.fecha_evaluacion as fecha_prueba
            FROM usuarios.Cuentas c
            INNER JOIN usuarios.Choferes ch ON c.id_usuario = ch.id_chofer
            LEFT JOIN operaciones.Bancos b ON ch.id_banco = b.id_banco
            OUTER APPLY (
                SELECT TOP 1 nota_psicologica, nota_vehiculo, fecha_evaluacion 
                FROM operaciones.Evaluaciones 
                WHERE id_chofer = ch.id_chofer 
                ORDER BY fecha_evaluacion DESC
            ) ev
            WHERE c.id_usuario = @id AND c.tipo_usuario = 'Chofer'
        `;
        const resultChofer = await pool.request().input('id', sql.Int, id_chofer).query(queryChofer);

        if (resultChofer.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Chofer no encontrado." });
        }

        // 2. Vehículos Aprobados
        const queryVehiculos = `
            SELECT v.id_vehiculo, v.marca, v.modelo, v.placa, v.color,
                   e.nota_vehiculo as calificacion_revision
            FROM operaciones.Vehiculos v
            LEFT JOIN operaciones.Evaluaciones e ON e.id_evaluacion = (
                SELECT TOP 1 id_evaluacion FROM operaciones.Evaluaciones WHERE id_vehiculo = v.id_vehiculo ORDER BY fecha_evaluacion DESC
            )
            WHERE v.id_chofer = @id
        `;
        const resultVehiculos = await pool.request().input('id', sql.Int, id_chofer).query(queryVehiculos);

        // 3. Vehículos Pendientes (En espera)
        const queryPendientes = `
            SELECT id_postulacion as id_vehiculo, marca, modelo, placa, color,
                   NULL as calificacion_revision
            FROM operaciones.VehiculosPendientes
            WHERE id_chofer = @id
        `;
        const resultPendientes = await pool.request().input('id', sql.Int, id_chofer).query(queryPendientes);

        // Unimos ambas listas para que el chofer los visualice todos
        const vehiculosTotales = [...resultVehiculos.recordset, ...resultPendientes.recordset];

        // 4. Conteo global de carreras del chofer
        let carrerasResult = await pool.request()
            .input('id', sql.Int, id_chofer)
            .query('SELECT COUNT(id_traslado) AS total FROM operaciones.Traslados WHERE id_chofer = @id');

        // Respuesta única unificada con todos los datos necesarios
        res.json({
            success: true,
            chofer: resultChofer.recordset[0],
            vehiculos: vehiculosTotales,
            totalCarrerasGlobal: carrerasResult.recordset[0].total || 0
        });

    } catch (err) {
        console.error("Error en perfil chofer:", err);
        res.status(500).json({ success: false, message: "Error en los esquemas SQL.", error: err.message });
    }
});

app.get('/api/chofer/traslados/:id', async (req, res) => {
    try {
        const id_chofer = req.params.id;
        const inicio = req.query.inicio || '2000-01-01';
        const fin = req.query.fin || '2099-12-31';

        const pool = await sql.connect(dbConfig);

        const queryPendientes = `
            SELECT fecha_traslado, punto_A AS origen, punto_B AS destino, ISNULL(pago_chofer, 0) AS pago_chofer 
            FROM operaciones.Traslados 
            WHERE id_chofer = @id AND estado_pago_chofer = 'Pendiente'
              AND fecha_traslado BETWEEN @inicio AND @fin
            ORDER BY fecha_traslado DESC
        `;
        const reqP = pool.request();
        reqP.input('id', sql.Int, id_chofer);
        reqP.input('inicio', sql.VarChar, inicio);
        reqP.input('fin', sql.VarChar, fin);
        const resP = await reqP.query(queryPendientes);

        const queryLiquidados = `
            SELECT fecha_traslado, punto_A AS origen, punto_B AS destino, ISNULL(pago_chofer, 0) AS pago_chofer 
            FROM operaciones.Traslados 
            WHERE id_chofer = @id AND estado_pago_chofer IN ('Liquidado', 'Pagado', 'Completado', 'Cancelado')
              AND fecha_traslado BETWEEN @inicio AND @fin
            ORDER BY fecha_traslado DESC
        `;
        const reqL = pool.request();
        reqL.input('id', sql.Int, id_chofer);
        reqL.input('inicio', sql.VarChar, inicio);
        reqL.input('fin', sql.VarChar, fin);
        const resL = await reqL.query(queryLiquidados);

        res.json({
            success: true,
            pendientes: resP.recordset,
            cancelados: resL.recordset,
            canceladosEmpresa: []
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/chofer/cambiar-password', async (req, res) => {
    const { id_cuenta, contrasenaActual, contrasenaNueva } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        let userRes = await pool.request()
            .input('id', sql.Int, id_cuenta)
            .input('pass', sql.VarChar, contrasenaActual)
            .query(`SELECT * FROM usuarios.Cuentas WHERE id_usuario = @id AND contrasena = @pass`);

        if (userRes.recordset.length === 0) {
            return res.status(400).json({ success: false, message: "La contraseña actual suministrada no es correcta." });
        }

        await pool.request()
            .input('id', sql.Int, id_cuenta)
            .input('newPass', sql.VarChar, contrasenaNueva)
            .query(`UPDATE usuarios.Cuentas SET contrasena = @newPass WHERE id_usuario = @id`);

        res.json({ success: true, message: "¡Contraseña actualizada de forma segura!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/chofer/agregar-vehiculo', async (req, res) => {
    const { id_cuenta, id_chofer, marca, modelo, placa, color } = req.body;
    const choferId = id_chofer || id_cuenta;

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_chofer', sql.Int, choferId)
            .input('marca', sql.VarChar, marca)
            .input('modelo', sql.VarChar, modelo)
            .input('placa', sql.VarChar, placa)
            .input('color', sql.VarChar, color)
            .query(`INSERT INTO operaciones.VehiculosPendientes (id_chofer, marca, modelo, placa, color, estado) 
                    VALUES (@id_chofer, @marca, @modelo, @placa, @color, 'Pendiente')`);

        res.json({ success: true, message: "Vehículo agregado y enviado a revisión administrativa exitosamente." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.put('/api/chofer/actualizar-expediente/:id', async (req, res) => {
    const id_cuenta = req.params.id;
    const { telefono, entidad_bancaria, nro_cuenta, c1, t1, c2, t2 } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        let id_banco = entidad_bancaria ? parseInt(entidad_bancaria) : null;
        if (isNaN(id_banco)) id_banco = null;

        await pool.request()
            .input('id_chofer', sql.Int, id_cuenta)
            .input('telefono', sql.VarChar, telefono || null)
            .input('id_banco', sql.Int, id_banco)
            .input('nro_cuenta', sql.VarChar, nro_cuenta || null)
            .input('c1', sql.VarChar, c1 || null)
            .input('t1', sql.VarChar, t1 || null)
            .input('c2', sql.VarChar, c2 || null)
            .input('t2', sql.VarChar, t2 || null)
            .query(`
                UPDATE usuarios.Choferes 
                SET telefono = ISNULL(@telefono, telefono),
                    id_banco = ISNULL(@id_banco, id_banco), 
                    nro_cuenta = ISNULL(@nro_cuenta, nro_cuenta),
                    contacto_emergencia1 = ISNULL(@c1, contacto_emergencia1),
                    telefono_emergencia1 = ISNULL(@t1, telefono_emergencia1),
                    contacto_emergencia2 = ISNULL(@c2, contacto_emergencia2),
                    telefono_emergencia2 = ISNULL(@t2, telefono_emergencia2)
                WHERE id_chofer = @id_chofer
            `);

        res.json({ success: true, message: "¡Expediente operativo actualizado con éxito!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error interno del servidor SQL.", error: err.message });
    }
});

app.delete('/api/chofer/eliminar-vehiculo/:id', async (req, res) => {
    const idVehiculo = req.params.id;

    try {
        let pool = await sql.connect(dbConfig);

        // 1. Verificar si el vehículo tiene traslados registrados
        const checkTraslados = await pool.request()
            .input('id_vehiculo', sql.Int, idVehiculo)
            .query(`SELECT COUNT(*) as total FROM operaciones.Traslados WHERE id_vehiculo = @id_vehiculo`);

        if (checkTraslados.recordset[0].total > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No se puede eliminar este vehículo porque posee un historial de traslados asociados.' 
            });
        }

        // 2. Eliminar evaluaciones previas vinculadas al vehículo
        await pool.request()
            .input('id_vehiculo', sql.Int, idVehiculo)
            .query(`DELETE FROM operaciones.Evaluaciones WHERE id_vehiculo = @id_vehiculo`);

        // 3. Eliminar de la tabla oficial de vehículos
        const resultadoVehiculo = await pool.request()
            .input('id_vehiculo', sql.Int, idVehiculo)
            .query(`DELETE FROM operaciones.Vehiculos WHERE id_vehiculo = @id_vehiculo`);

        // 4. Eliminar por si seguía en la tabla de pendientes
        await pool.request()
            .input('id_vehiculo', sql.Int, idVehiculo)
            .query(`DELETE FROM operaciones.VehiculosPendientes WHERE id_postulacion = @id_vehiculo`);

        if (resultadoVehiculo.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Vehículo eliminado con éxito.' });
        } else {
            res.status(404).json({ success: false, message: 'Vehículo no encontrado.' });
        }

    } catch (err) {
        console.error("Error al eliminar vehículo:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/bancos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM operaciones.Bancos');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: "Fallo en SQL: " + error.message });
    }
});

app.post('/api/admin/evaluar-vehiculo-adicional', async (req, res) => {
    const { idVehiculo, nota, fechaObtencion } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        if (nota < 65 || nota > 100) {
            return res.status(400).json({ success: false, message: "La calificación mínima aprobatoria del vehículo es 65 y la máxima 100." });
        }

        await pool.request()
            .input('id_vehiculo', sql.Int, idVehiculo)
            .input('nota', sql.Int, nota)
            .input('fecha', sql.Date, fechaObtencion)
            .query(`UPDATE operaciones.Vehiculos 
                    SET calificacion_revision = @nota, fecha_revision = @fecha 
                    WHERE id_vehiculo = @id_vehiculo`);

        res.json({ success: true, message: "Vehículo adicional evaluado y actualizado con éxito." });
    } catch (err) {
        console.error("Error al evaluar vehículo adicional:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/ganancias', async (req, res) => {
    const { fechaDesde, fechaHasta } = req.query;
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('desde', sql.VarChar, fechaDesde)
            .input('hasta', sql.VarChar, fechaHasta)
            .query(`
                SELECT SUM(ganancia_empresa) as total_ganancias, COUNT(id_traslado) as total_viajes
                FROM operaciones.Traslados
                WHERE CONVERT(date, fecha_traslado) BETWEEN CONVERT(date, @desde) AND CONVERT(date, @hasta)
            `);

        res.json({
            success: true,
            ganancias: result.recordset[0].total_ganancias || 0,
            totalViajes: result.recordset[0].total_viajes || 0
        });
    } catch (err) {
        console.error("Error al calcular ganancias:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/admin/historial-pagos-chofer', async (req, res) => {
    const { id_chofer, fechaDesde, fechaHasta } = req.query;
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('desde', sql.VarChar, fechaDesde)
            .input('hasta', sql.VarChar, fechaHasta)
            .query(`
                SELECT id_pago, monto_pagado, fecha_pago, nro_referencia
                FROM operaciones.PagosChoferes
                WHERE id_chofer = @id_chofer
                  AND CONVERT(date, fecha_pago) BETWEEN CONVERT(date, @desde) AND CONVERT(date, @hasta)
                ORDER BY fecha_pago DESC
            `);

        res.json({
            success: true,
            pagos: result.recordset
        });
    } catch (err) {
        console.error("Error al consultar historial de pagos:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ==========================================
// 10. ARRANQUE DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
});