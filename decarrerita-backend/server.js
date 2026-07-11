const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const dbConfig = {
    user: 'sa',
    password: 'Gatito1614.', // REEMPLAZA CON TU CONTRASEÑA DE SSMS
    server: 'localhost',
    database: 'Decarrerita',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// ENDPOINT 1: LOGIN (Mejorado para jalar el saldo si es Cliente)
app.post('/api/login', async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query(`
                SELECT C.id_usuario, C.tipo_usuario, CL.saldo_usuario AS saldo
                FROM usuarios.Cuentas C
                LEFT JOIN usuarios.Clientes CL ON C.id_usuario = CL.id_cliente
                WHERE C.correo = @correo AND C.contrasena = @contrasena
            `);

        if (result.recordset.length > 0) {
            res.json({ success: true, usuario: result.recordset[0] });
        } else {
            res.status(401).json({ success: false, message: "Correo o contraseña incorrectos." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT 2: REGISTRO DE CLIENTE
app.post('/api/registro-cliente', async (req, res) => {
    const { nombre, apellido, cedula, telefono, correo, contrasena } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        
        // Insertamos la cuenta primero
        let cuentaRes = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .query(`INSERT INTO usuarios.Cuentas (correo, contrasena, tipo_usuario) 
                    OUTPUT INSERTED.id_usuario 
                    VALUES (@correo, @contrasena, 'Cliente')`);
        
        const newId = cuentaRes.recordset[0].id_usuario;

        // Insertamos el perfil del cliente amarrado al ID generado con saldo 0 inicial
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

// ENDPOINT 3: POSTULACIÓN DE CHOFER (Se registra con datos nulos de banco y notas por ahora)
app.post('/api/registro-chofer', async (req, res) => {
    const { 
        nombre, apellido, cedula, telefono, correo, contrasena, 
        marca, modelo, placa, color,
        contacto_emergencia1, telefono_emergencia1, contacto_emergencia2, telefono_emergencia2 
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

        // SE INCLUYEN LOS CONTACTOS OBLIGATORIOS EN EL INSERT
        await pool.request()
            .input('id_chofer', sql.Int, newId)
            .input('nombre', sql.VarChar, nombre)
            .input('apellido', sql.VarChar, apellido)
            .input('cedula', sql.VarChar, cedula)
            .input('telefono', sql.VarChar, telefono)
            .input('c1', sql.VarChar, contacto_emergencia1)
            .input('t1', sql.VarChar, telefono_emergencia1)
            .input('c2', sql.VarChar, contacto_emergencia2)
            .input('t2', sql.VarChar, telefono_emergencia2)
            .query(`INSERT INTO usuarios.Choferes (id_chofer, nombre, apellido, telefono, cedula, contacto_emergencia1, telefono_emergencia1, contacto_emergencia2, telefono_emergencia2)
                    VALUES (@id_chofer, @nombre, @apellido, @telefono, @cedula, @c1, @t1, @c2, @t2)`);

        await pool.request()
            .input('id_chofer', sql.Int, newId)
            .input('marca', sql.VarChar, marca)
            .input('modelo', sql.VarChar, modelo)
            .input('placa', sql.VarChar, placa)
            .input('color', sql.VarChar, color)
            .query(`INSERT INTO operaciones.Vehiculos (id_chofer, marca, modelo, placa, color)
                    VALUES (@id_chofer, @marca, @modelo, @placa, @color)`);

        res.json({ success: true, id_chofer: newId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// ENDPOINT 4: ADMINISTRADOR ASIGNA NOTAS Y EVALUACIÓN
app.post('/api/evaluar-postulante', async (req, res) => {
    const { id_chofer, nota_psicologica, nota_vehiculo, id_banco, nro_cuenta } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        // 1. Buscamos el ID del primer vehículo del chofer
        let vehiculoRes = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`SELECT id_vehiculo FROM operaciones.Vehiculos WHERE id_chofer = @id_chofer`);

        if(vehiculoRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Vehículo del chofer no encontrado." });
        }
        const id_vehiculo = vehiculoRes.recordset[0].id_vehiculo;

        // 2. Insertamos la evaluación con la fecha actual del sistema
        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('id_vehiculo', sql.Int, id_vehiculo)
            .input('nota_p', sql.Int, nota_psicologica)
            .input('nota_v', sql.Int, nota_vehiculo)
            .query(`INSERT INTO operaciones.Evaluaciones (id_chofer, id_vehiculo, nota_psicologica, nota_vehiculo, fecha_evaluacion)
                    VALUES (@id_chofer, @id_vehiculo, @nota_p, @nota_v, GETDATE())`);

        // 3. Si el banco y cuenta fueron ingresados, actualizamos la información bancaria del chofer
        if (id_banco && nro_cuenta) {
            await pool.request()
                .input('id_chofer', sql.Int, id_chofer)
                .input('id_banco', sql.Int, id_banco)
                .input('nro_cuenta', sql.VarChar, nro_cuenta)
                .query(`UPDATE usuarios.Choferes 
                        SET id_banco = @id_banco, nro_cuenta = @nro_cuenta 
                        WHERE id_chofer = @id_chofer`);
        }

        // 4. Verificación de reglas de negocio
        if (nota_psicologica >= 73 && nota_vehiculo >= 65) {
            res.json({ success: true, message: "🎉 Chofer y Vehículo EVALUADOS Y APROBADOS para laborar en Decarrerita." });
        } else {
            res.json({ success: true, message: "⚠️ Evaluación registrada. El postulante RECHAZÓ por no cumplir las notas mínimas requeridas." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT: OBTENER EL HISTORIAL DE RECARGAS (Línea 172 corregida)
app.get('/api/historial-recargas/:id', async (req, res) => {
    try {
        const idClienteInt = parseInt(req.params.id);

        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('id', sql.Int, idClienteInt)
            // Usamos las columnas reales de tu DDL: fecha_recarga, monto, nro_referencia e id_banco_origen
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
// ENDPOINT: EJECUTAR RECARGA DE SALDO (INSERT + UPDATE)
// ENDPOINT: EJECUTAR RECARGA DE SALDO
app.post('/api/recargar-saldo', async (req, res) => {
    const { id_cliente, monto, nro_referencia, banco } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        
        // 1. Obtener el id_banco a partir del nombre del banco enviado por el frontend
        let bancoRes = await pool.request()
            .input('nombre_banco', sql.VarChar, banco)
            .query(`SELECT id_banco FROM operaciones.Bancos WHERE nombre_banco = @nombre_banco`);
            
        if (bancoRes.recordset.length === 0) {
            return res.status(400).json({ success: false, message: 'El banco seleccionado no existe.' });
        }
        
        const id_banco_origen = bancoRes.recordset[0].id_banco;

        // 2. Insertar en la tabla operaciones.Recargas usando la columna exacta de tu DDL
        await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('monto', sql.Decimal(18,2), monto)
            .input('ref', sql.VarChar, nro_referencia)
            .input('id_banco_origen', sql.Int, id_banco_origen)
            .query(`INSERT INTO operaciones.Recargas (id_cliente, monto, fecha_recarga, nro_referencia, id_banco_origen)
                    VALUES (@id_cliente, @monto, GETDATE(), @ref, @id_banco_origen)`);

        // 3. Modificar el saldo a favor del Cliente en usuarios.Clientes
        let updateRes = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('monto', sql.Decimal(18,2), monto)
            .query(`UPDATE usuarios.Clientes 
                    SET saldo_usuario = saldo_usuario + @monto 
                    OUTPUT INSERTED.saldo_usuario
                    WHERE id_cliente = @id_cliente`);

        res.json({ success: true, nuevoSaldo: updateRes.recordset[0].saldo_usuario });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT: OBTENER EL HISTORIAL DE RECARGAS
// CORRECCIÓN EN SERVER.JS
// ENDPOINT CORREGIDO: HISTORIAL DE RECARGAS
// ENDPOINT GENERAL Y DINÁMICO PARA CUALQUIER CLIENTE
app.get('/api/historial-recargas/:id', async (req, res) => {
    try {
        const idClienteInt = parseInt(req.params.id);

        let pool = await sql.connect(dbConfig);
        let result = await pool.request()
            .input('id', sql.Int, idClienteInt)
            // Cambiado r.monto_recargado por r.monto (Exactamente como tu tabla SQL)
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
// ENDPOINT: SOLICITAR VIAJE CON SELECCIÓN ALEATORIA DE CHOFER APROBADO
// ENDPOINT: SOLICITAR VIAJE CORREGIDO (Usa operaciones.Traslados)
app.post('/api/solicitar-traslado', async (req, res) => {
    const { id_cliente, origen, destino } = req.body;
    
    // Tus valores exactos de la simulación práctica de tu script SQL:
    const DISTANCIA_KM = 5.00; 
    const COSTO_TOTAL = 7.00; 
    const GANANCIA_EMPRESA = COSTO_TOTAL * 0.30; // $2.10
    const PAGO_CHOFER = COSTO_TOTAL * 0.70;      // $4.90

    try {
        let pool = await sql.connect(dbConfig);

        // 1. Verificar si el cliente tiene saldo suficiente
        let clienteRes = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query(`SELECT saldo_usuario FROM usuarios.Clientes WHERE id_cliente = @id_cliente`);
        
        if (clienteRes.recordset.length === 0 || clienteRes.recordset[0].saldo_usuario < COSTO_TOTAL) {
            return res.status(400).json({ success: false, message: "Saldo insuficiente para realizar el traslado." });
        }

        // 2. Traer un Chofer ALEATORIO que esté APROBADO (Filtros según tus notas mínimas)
        let choferRes = await pool.query(`
            SELECT TOP 1 CH.id_chofer, CH.nombre, CH.apellido, V.id_vehiculo, V.marca, V.modelo, V.placa, V.color
            FROM operaciones.Evaluaciones E
            INNER JOIN usuarios.Choferes CH ON E.id_chofer = CH.id_chofer
            INNER JOIN operaciones.Vehiculos V ON E.id_vehiculo = V.id_vehiculo
            WHERE E.nota_psicologica >= 73 AND E.nota_vehiculo >= 65
            ORDER BY NEWID()
        `);

        if (choferRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "No hay choferes disponibles aprobados en el sistema." });
        }

        const choferAsignado = choferRes.recordset[0];

        // 3. Descontar saldo al cliente
        let clienteUpdate = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('costo', sql.Decimal(18,2), COSTO_TOTAL)
            .query(`UPDATE usuarios.Clientes SET saldo_usuario = saldo_usuario - @costo 
                    OUTPUT INSERTED.saldo_usuario WHERE id_cliente = @id_cliente`);

        // 4. Sumar saldo al chofer (Afectación de saldos según tu paso 3 del script)
        await pool.request()
            .input('id_chofer', sql.Int, choferAsignado.id_chofer)
            .input('pago', sql.Decimal(18,2), PAGO_CHOFER)
            .query(`UPDATE usuarios.Choferes SET saldo_a_favor = saldo_a_favor + @pago WHERE id_chofer = @id_chofer`);

        // 5. Registrar en la tabla operaciones.Traslados (Estructura exacta de tu DDL)
        await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .input('id_chofer', sql.Int, choferAsignado.id_chofer)
            .input('id_vehiculo', sql.Int, choferAsignado.id_vehiculo)
            .input('punto_A', sql.VarChar, origen)
            .input('punto_B', sql.VarChar, destino)
            .input('distancia_km', sql.Decimal(5,2), DISTANCIA_KM)
            .input('costo_total', sql.Decimal(18,2), COSTO_TOTAL)
            .input('ganancia_empresa', sql.Decimal(18,2), GANANCIA_EMPRESA)
            .input('pago_chofer', sql.Decimal(18,2), PAGO_CHOFER)
            .query(`INSERT INTO operaciones.Traslados 
                    (id_cliente, id_chofer, id_vehiculo, punto_A, punto_B, distancia_km, costo_total, ganancia_empresa, pago_chofer, fecha_traslado, estado_pago_chofer)
                    VALUES 
                    (@id_cliente, @id_chofer, @id_vehiculo, @punto_A, @punto_B, @distancia_km, @costo_total, @ganancia_empresa, @pago_chofer, GETDATE(), 'Pendiente')`);

        res.json({ 
            success: true, 
            nuevoSaldoCliente: clienteUpdate.recordset[0].saldo_usuario,
            costoViaje: COSTO_TOTAL,
            chofer: choferAsignado
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT: ESTADOS DE CUENTA CORPORATIVOS (GANANCIAS Y CUSTODIAS)
app.get('/api/admin/reportes-financieros', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        
        // Calcular el 30% retenido por la empresa de la tabla operaciones.Traslados
        let gananciaRes = await pool.query(`SELECT SUM(ganancia_empresa) AS total_ganancia FROM operaciones.Traslados`);
        
        // Calcular el total del dinero en custodia de las cuentas de clientes activos
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

// ENDPOINT: REGISTRAR LIQUIDACIÓN DE PAGO A UN CHOFER
app.post('/api/admin/pagar-chofer', async (req, res) => {
    const { id_chofer, monto, nro_referencia } = req.body;
    try {
        let pool = await sql.connect(dbConfig);

        // 1. Validar existencia y fondos disponibles del chofer
        let choferRes = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`SELECT saldo_a_favor FROM usuarios.Choferes WHERE id_chofer = @id_chofer`);

        if (choferRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Chofer no encontrado en la base de datos." });
        }

        if (choferRes.recordset[0].saldo_a_favor < monto) {
            return res.status(400).json({ success: false, message: `Fondos insuficientes. El chofer posee $${choferRes.recordset[0].saldo_a_favor.toFixed(2)}.` });
        }

        // 2. Insertar el recibo de liquidación en operaciones.PagosChoferes
        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('monto_pagado', sql.Decimal(18,2), monto)
            .input('nro_referencia', sql.VarChar, nro_referencia)
            .query(`INSERT INTO operaciones.PagosChoferes (id_chofer, monto_pagado, fecha_pago, nro_referencia)
                    VALUES (@id_chofer, @monto_pagado, GETDATE(), @nro_referencia)`);

        // 3. Modificar el saldo del chofer restando el valor pagado
        let choferUpdate = await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .input('monto', sql.Decimal(18,2), monto)
            .query(`UPDATE usuarios.Choferes 
                    SET saldo_a_favor = saldo_a_favor - @monto 
                    OUTPUT INSERTED.saldo_a_favor
                    WHERE id_chofer = @id_chofer`);

        // 4. Actualizar el estado de los traslados liquidados a 'Cancelado'
        await pool.request()
            .input('id_chofer', sql.Int, id_chofer)
            .query(`UPDATE operaciones.Traslados SET estado_pago_chofer = 'Cancelado' WHERE id_chofer = @id_chofer AND estado_pago_chofer = 'Pendiente'`);

        res.json({ 
            success: true, 
            nuevoSaldoChofer: choferUpdate.recordset[0].saldo_a_favor 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT: PERFIL CON CONTEO ESTATÍSTICO DE CARRERAS POR AUTO INDEPENDIENTE
// ENDPOINT MASTER: TRAE DATOS, NOTAS PSICOLÓGICAS Y SEGUROS DEL CHOFER
// =================================================================
// RUTA EN SERVER.JS: OBTENER PERFIL COMPLETO DEL CHOFER
// =================================================================
app.get('/api/chofer/perfil/:id', async (req, res) => {
    try {
        const id_chofer = req.params.id;
        const pool = await sql.connect(dbConfig);

        const queryChofer = `
            SELECT 
                c.id_usuario, 
                ch.nombre, 
                ch.apellido, 
                ch.cedula, 
                ch.telefono, 
                c.correo,
                ISNULL(ch.saldo_a_favor, 0) as saldo_a_favor,
                b.nombre_banco as entidad_bancaria,
                ch.nro_cuenta,
                ch.contacto_emergencia1,
                ch.telefono_emergencia1,
                ch.contacto_emergencia2,
                ch.telefono_emergencia2,
                ISNULL(ev.nota_psicologica, 0) as nota_psicologica,
                ev.fecha_evaluacion as fecha_prueba
            FROM usuarios.Cuentas c
            INNER JOIN usuarios.Choferes ch ON c.id_usuario = ch.id_chofer
            LEFT JOIN operaciones.Bancos b ON ch.id_banco = b.id_banco
            OUTER APPLY (
                SELECT TOP 1 nota_psicologica, fecha_evaluacion 
                FROM operaciones.Evaluaciones 
                WHERE id_chofer = ch.id_chofer 
                ORDER BY fecha_evaluacion DESC
            ) ev
            WHERE c.id_usuario = @id AND c.tipo_usuario = 'Chofer'
        `;



       const requestChofer = pool.request();
        requestChofer.input('id', sql.Int, id_chofer);
        const resultChofer = await requestChofer.query(queryChofer);

        // 👇 AÑADE ESTO PARA VER QUÉ TRAE REALMENTE LA BASE DE DATOS EN LA TERMINAL
        console.log("DATOS DEL CHOFER DESDE SQL:", resultChofer.recordset[0]);

        if (resultChofer.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Chofer no encontrado." });
        }

        let vehiculos = [];
        try {
            const queryVehiculos = `
                SELECT id_vehiculo, marca, modelo, placa, color,
                       ISNULL((SELECT TOP 1 nota_vehiculo FROM operaciones.Evaluaciones WHERE id_vehiculo = v.id_vehiculo ORDER BY fecha_evaluacion DESC), 0) as calificacion_revision,
                       (SELECT COUNT(*) FROM operaciones.Traslados WHERE id_vehiculo = v.id_vehiculo) as total_carreras
                FROM operaciones.Vehiculos v
                WHERE v.id_chofer = @id
            `;
            const requestVehiculos = pool.request();
            requestVehiculos.input('id', sql.Int, id_chofer);
            const resultVehiculos = await requestVehiculos.query(queryVehiculos);
            vehiculos = resultVehiculos.recordset;
        } catch (vehErr) {
            console.log("⚠️ Nota al cargar vehículos:", vehErr.message);
        }

        res.json({
            success: true,
            chofer: resultChofer.recordset[0],
            vehiculos: vehiculos || []
        });

    } catch (err) {
        console.error("❌ ERROR EN PERFIL:", err.message);
        res.status(500).json({ success: false, message: "Error en los esquemas SQL.", error: err.message });
    }
});

app.get('/api/chofer/traslados/:id', async (req, res) => {
    try {
        const id_chofer = req.params.id;
        const inicio = req.query.inicio || '2000-01-01';
        const fin = req.query.fin || '2099-12-31';

        const pool = await sql.connect(dbConfig);

        // Carreras pendientes por liquidar
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

        // Carreras pagadas / liquidadas
        const queryCancelados = `
            SELECT fecha_traslado, punto_A AS origen, punto_B AS destino, ISNULL(pago_chofer, 0) AS pago_chofer 
            FROM operaciones.Traslados 
            WHERE id_chofer = @id AND estado_pago_chofer IN ('Liquidado', 'Pagado', 'Completado')
              AND fecha_traslado BETWEEN @inicio AND @fin
            ORDER BY fecha_traslado DESC
        `;
        const reqC = pool.request();
        reqC.input('id', sql.Int, id_chofer);
        reqC.input('inicio', sql.VarChar, inicio);
        reqC.input('fin', sql.VarChar, fin);
        const resC = await reqC.query(queryCancelados);

        res.json({
            success: true,
            pendientes: resP.recordset,
            cancelados: resC.recordset
        });

    } catch (err) {
        console.error("❌ Error en traslados del chofer:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});
// ENDPOINT: SEGURIDAD - MODIFICAR CONTRASEÑA DE ACCESO
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

// ENDPOINT: ACTUALIZAR CONTACTOS DE OPERACIÓN
app.put('/api/chofer/actualizar-contactos', async (req, res) => {
    const { id_cuenta, c1, t1, c2, t2 } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id_cuenta)
            .input('c1', sql.VarChar, c1)
            .input('t1', sql.VarChar, t1)
            .input('c2', sql.VarChar, c2)
            .input('t2', sql.VarChar, t2)
            .query(`UPDATE usuarios.Choferes 
                    SET contacto_emergencia1 = @c1, telefono_emergencia1 = @t1,
                        contacto_emergencia2 = @c2, telefono_emergencia2 = @t2
                    WHERE id_cuenta = @id`);
        res.json({ success: true, message: "Contactos de emergencia actualizados en base de datos." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ENDPOINT: AGREGAR UN VEHÍCULO ADICIONAL A UN CHOFER EXISTENTE
// Ejemplo de cómo debe lucir la ruta en tu backend (Node.js/Express)
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
            // INSERTAMOS SOLO LAS COLUMNAS QUE EXISTEN EN TU CREATE TABLE
            .query(`INSERT INTO operaciones.Vehiculos (id_chofer, marca, modelo, placa, color) 
                    VALUES (@id_chofer, @marca, @modelo, @placa, @color)`);
                    
        res.json({ success: true, message: "Vehículo agregado exitosamente." });
    } catch (error) {
        console.error("Error al registrar vehículo en servidor:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
// ENDPOINT: ACTUALIZAR EXPEDIENTE COMPLETO DEL CHOFER (TELÉFONO, BANCO Y CUENTA)
// ENDPOINT: ACTUALIZAR EXPEDIENTE COMPLETO DEL CHOFER (BLINDADO)
app.put('/api/chofer/actualizar-expediente/:id', async (req, res) => {
    const id_cuenta = req.params.id; 
    const { telefono, entidad_bancaria, nro_cuenta, c1, t1, c2, t2 } = req.body;
    
    try {
        let pool = await sql.connect(dbConfig);
        
        // Convertimos a número. Si viene vacío o null, se transformará en null para SQL
        let id_banco = entidad_bancaria ? parseInt(entidad_bancaria) : null;
        if (isNaN(id_banco)) id_banco = null;

        // 2. Actualizamos los datos utilizando ISNULL de manera segura
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
        console.error("❌ Error en actualizar-expediente:", err.message);
        res.status(500).json({ success: false, message: "Error interno del servidor SQL.", error: err.message });
    }
});
// EN TU ARCHIVO server.js (Línea 618 aprox.)
// EN TU ARCHIVO server.js
// EN TU ARCHIVO server.js
// ==========================================
// ENDPOINT: OBTENER LISTA DE BANCOS
// ==========================================
app.get('/api/bancos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM operaciones.Bancos');
        res.json(result.recordset);
    } catch (error) {
        // Al poner error.message aquí, el error saldrá EN LA PÁGINA WEB, no solo en la terminal
        res.status(500).json({ error: "Fallo en SQL: " + error.message });
    }
});
// ==========================================
// ARRANQUE DEL SERVIDOR (Asegúrate de que quede así al final del archivo)
// ==========================================

// ENDPOINT: ACTUALIZAR EXPEDIENTE COMPLETO DEL CHOFER (CON ID DE BANCO DIRECTO)

app.delete('/api/chofer/eliminar-vehiculo/:id', async (req, res) => {
    const id_vehiculo = req.params.id;
    
    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id_vehiculo', sql.Int, id_vehiculo)
            .query(`DELETE FROM operaciones.Vehiculos WHERE id_vehiculo = @id_vehiculo`);
            
        res.json({ success: true, message: "Vehículo eliminado correctamente de la base de datos." });
    } catch (error) {
        console.error("Error al eliminar vehículo en servidor:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(3000, () => {
    console.log("🚀 Servidor Backend corriendo en http://localhost:3000");
});