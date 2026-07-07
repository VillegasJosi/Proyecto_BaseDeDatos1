const API_URL = "http://localhost:3000/api";
let idUsuarioLogueado = null;

function mostrarPantalla(idPantalla) {
    const pantallas = ['vista-login', 'vista-registro-cliente', 'vista-registro-chofer', 'panel-cliente', 'panel-admin', 'panel-chofer'];
    pantallas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('oculto');
    });
    const pantallaObjetivo = document.getElementById(idPantalla);
    if (pantallaObjetivo) pantallaObjetivo.classList.remove('oculto');
}

// =================================================================
// 1. LOGIN
// =================================================================
async function iniciarSesion() {
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;

    if (!correo || !contrasena) {
        alert("Por favor, llena todos los campos.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });
        const datos = await respuesta.json();

        if (datos.success) {
            idUsuarioLogueado = datos.usuario.id_usuario; 
            const tipoUsuario = datos.usuario.tipo_usuario;

            if (tipoUsuario === 'Personal Administrativo' || tipoUsuario === 'Administrador') {
                mostrarPantalla('panel-admin');
                cargarReportesFinancieros(); 
            } 
            else if (tipoUsuario === 'Chofer') {
                mostrarPantalla('panel-chofer'); 
                await cargarDatosChofer();
            } 
            else if (tipoUsuario === 'Cliente') {
                mostrarPantalla('panel-cliente');
                if (document.getElementById('saldo-cliente')) {
                    document.getElementById('saldo-cliente').innerText = `$${parseFloat(datos.usuario.saldo || 0).toFixed(2)}`;
                }
                cargarHistorialRecargas(); 
            }
        } else {
            alert("Error: " + datos.message);
        }
    } catch (error) {
        alert("Error al conectar con el servidor.");
    }
}

// =================================================================
// 2. REGISTROS (CLIENTE Y CHOFER)
// =================================================================
async function registrarCliente() {
    const nombre = document.getElementById('reg-cli-nombre').value;
    const apellido = document.getElementById('reg-cli-apellido').value;
    const cedula = document.getElementById('reg-cli-cedula').value;
    const telefono = document.getElementById('reg-cli-telefono').value;
    const correo = document.getElementById('reg-cli-correo').value;
    const contrasena = document.getElementById('reg-cli-contrasena').value;

    try {
        const res = await fetch(`${API_URL}/registro-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, cedula, telefono, correo, contrasena })
        });
        const data = await res.json();
        if (data.success) {
            alert("¡Cliente registrado!");
            mostrarPantalla('vista-login');
        } else { alert("Error: " + data.message); }
    } catch (err) { alert("Error de conexión."); }
}

async function registrarChofer() {
    const nombre = document.getElementById('reg-chof-nombre').value;
    const apellido = document.getElementById('reg-chof-apellido').value;
    const cedula = document.getElementById('reg-chof-cedula').value;
    const telefono = document.getElementById('reg-chof-telefono').value;
    const correo = document.getElementById('reg-chof-correo').value;
    const contrasena = document.getElementById('reg-chof-contrasena').value;
    const marca = document.getElementById('reg-chof-marca').value;
    const modelo = document.getElementById('reg-chof-modelo').value;
    const placa = document.getElementById('reg-chof-placa').value;
    const color = document.getElementById('reg-chof-color').value;
    const contacto_emergencia1 = document.getElementById('reg-chof-contacto1').value;
    const telefono_emergencia1 = document.getElementById('reg-chof-telefono1').value;
    const contacto_emergencia2 = document.getElementById('reg-chof-contacto2').value;
    const telefono_emergencia2 = document.getElementById('reg-chof-telefono2').value;

    try {
        const res = await fetch(`${API_URL}/registro-chofer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, cedula, telefono, correo, contrasena, marca, modelo, placa, color, contacto_emergencia1, telefono_emergencia1, contacto_emergencia2, telefono_emergencia2 })
        });
        const data = await res.json();
        if (data.success) {
            alert("¡Postulación enviada!");
            mostrarPantalla('vista-login');
        } else { alert("Error: " + data.message); }
    } catch (err) { alert("Error de conexión."); }
}

// =================================================================
// 3. ADMINISTRACIÓN
// =================================================================
async function guardarEvaluacionAdmin() {
    const id_chofer = document.getElementById('eval-id-chofer').value;
    const nota_psicologica = parseInt(document.getElementById('eval-nota-psico').value);
    const nota_vehiculo = parseInt(document.getElementById('eval-nota-vehiculo').value);
    const id_banco = document.getElementById('eval-id-banco').value;
    const nro_cuenta = document.getElementById('eval-nro-cuenta').value;

    try {
        const res = await fetch(`${API_URL}/evaluar-postulante`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_chofer, nota_psicologica, nota_vehiculo, id_banco, nro_cuenta })
        });
        const data = await res.json();
        alert(data.message);
    } catch (err) { alert("Error de red."); }
}

async function cargarReportesFinancieros() {
    try {
        const res = await fetch(`${API_URL}/admin/reportes-financieros`);
        const data = await res.json();
        if (data.success) {
            if(document.getElementById('ganancia-empresa-total')) document.getElementById('ganancia-empresa-total').innerText = `$${parseFloat(data.totalGanancia).toFixed(2)}`;
            if(document.getElementById('saldo-clientes-total')) document.getElementById('saldo-clientes-total').innerText = `$${parseFloat(data.totalCustodia).toFixed(2)}`;
        }
    } catch (err) {}
}

async function ejecutarPagoChofer() {
    const id_chofer = document.getElementById('pago-chof-id').value;
    const monto = document.getElementById('pago-chof-monto').value;
    const nro_referencia = document.getElementById('pago-chof-ref').value;

    try {
        const res = await fetch(`${API_URL}/admin/pagar-chofer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_chofer, monto, nro_referencia })
        });
        const data = await res.json();
        if (data.success) { alert("Pago registrado."); cargarReportesFinancieros(); }
    } catch (err) { alert("Error."); }
}

// =================================================================
// 4. CLIENTE
// =================================================================
async function ejecutarRecargaSaldo() {
    const monto = document.getElementById('recarga-monto').value;
    const nro_referencia = document.getElementById('recarga-referencia').value;
    const banco = document.getElementById('recarga-banco').value;

    try {
        const res = await fetch(`${API_URL}/recargar-saldo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idUsuarioLogueado, monto, nro_referencia, banco })
        });
        const data = await res.json();
        if (data.success) {
            alert("Recarga exitosa.");
            document.getElementById('saldo-cliente').innerText = `$${data.nuevoSaldo.toFixed(2)}`;
            cargarHistorialRecargas();
        }
    } catch (err) {}
}

async function cargarHistorialRecargas() {
    try {
        const res = await fetch(`${API_URL}/historial-recargas/${idUsuarioLogueado}`);
        const data = await res.json();
        const tbody = document.getElementById('tabla-recargas-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        if (data.success && data.recargas.length > 0) {
            data.recargas.forEach(rec => {
                tbody.innerHTML += `<tr><td>${new Date(rec.fecha_recarga).toLocaleDateString()}</td><td>${rec.banco_origin || 'N/A'}</td><td>${rec.nro_referencia}</td><td>$${parseFloat(rec.monto_recargado).toFixed(2)}</td></tr>`;
            });
        }
    } catch (err) {}
}

async function solicitarTrasladoReal() {
    const origen = document.getElementById('viaje-origen').value;
    const destino = document.getElementById('viaje-destino').value;

    try {
        const res = await fetch(`${API_URL}/solicitar-traslado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idUsuarioLogueado, origen, destino })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('saldo-cliente').innerText = `$${data.nuevoSaldoCliente.toFixed(2)}`;
            document.getElementById('txt-nombre-chofer').innerText = `${data.chofer.nombre} ${data.chofer.apellido}`;
            document.getElementById('txt-auto-chofer').innerText = `${data.chofer.marca} ${data.chofer.modelo}`;
            document.getElementById('txt-costo-viaje').innerText = `$${data.costoViaje.toFixed(2)}`;
            document.getElementById('info-vehiculo-asignado').classList.remove('oculto');
        } else { alert(data.message); }
    } catch (err) {}
}

// =================================================================
// 5. CHOFER (LOGICA ASOCIADA A LOS NUEVOS IDS)
// =================================================================
function cambiarTabChofer(idTab) {
    document.querySelectorAll('.tab-content-chof').forEach(el => el.classList.add('oculto'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
    
    const tabElement = document.getElementById(idTab);
    if (tabElement) tabElement.classList.remove('oculto');
    
    if (idTab === 'chof-tab-resumen') document.getElementById('btn-tab-resumen').classList.add('active-tab');
    if (idTab === 'chof-tab-autos') document.getElementById('btn-tab-autos').classList.add('active-tab');
    if (idTab === 'chof-tab-viajes') document.getElementById('btn-tab-viajes').classList.add('active-tab');
    if (idTab === 'chof-tab-perfil') document.getElementById('btn-tab-perfil').classList.add('active-tab');
}

async function cargarDatosChofer() {
    if (!idUsuarioLogueado) return;
    try {
        console.log("Solicitando expediente para chofer ID:", idUsuarioLogueado);
        const res = await fetch(`${API_URL}/chofer/perfil/${idUsuarioLogueado}`);
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("Error del servidor:", errData);
            alert("El servidor regresó un error 500. Revisa la terminal de Node.js para ver qué columna o tabla falló en SQL.");
            return;
        }

        const data = await res.json();
        
        if (data.success && data.chofer) {
            const chof = data.chofer;

            // =========================================================
            // 1. SALUDO DE CABECERA Y ID DE CUENTA
            // =========================================================
            const txtSaludo = document.getElementById('chof-nombre-saludo') || document.querySelector('.header-driver h2 span');
            if (txtSaludo) txtSaludo.innerText = chof.nombre || 'Conductor';

            const txtIdTop = document.getElementById('chof-id-cuenta-top') || document.querySelector('.header-driver p span') || document.getElementById('perf-id-cuenta');
            if (txtIdTop) txtIdTop.innerText = idUsuarioLogueado;

            // =========================================================
            // 2. TARJETAS DE RESUMEN Y NOTAS
            // =========================================================
            const saldoFavor = chof.saldo_a_favor != null ? parseFloat(chof.saldo_a_favor) : 0.00;
            const txtSaldo = document.getElementById('chof-saldo-favor') || document.querySelector('.card-resumen h3') || document.querySelector('.card h3') || document.getElementById('saldo-acumulado-cobrar');
            if (txtSaldo) txtSaldo.innerText = `$${saldoFavor.toFixed(2)}`;

            // =========================================================
            // 3. SECCIÓN DE DATOS DE IDENTIDAD FIJOS (No Modificables)
            // =========================================================
            const camposCargando = document.querySelectorAll('p');
            camposCargando.forEach(p => {
                if (p.innerText.includes("Nombre Completo:")) {
                    p.innerHTML = `Nombre Completo: <strong>${chof.nombre} ${chof.apellido}</strong>`;
                }
                if (p.innerText.includes("Cédula") || p.innerText.includes("Identidad:")) {
                    p.innerHTML = `Cédula de Identidad: <strong>${chof.cedula}</strong>`;
                }
                if (p.innerText.includes("Correo")) {
                    p.innerHTML = `Correo Electrónico: <strong>${chof.correo}</strong>`;
                }
            });

            // Mapeo directo por ID si los creaste en tu HTML
            if (document.getElementById('lbl-chof-nombre')) document.getElementById('lbl-chof-nombre').innerText = `${chof.nombre} ${chof.apellido}`;
            if (document.getElementById('lbl-chof-cedula')) document.getElementById('lbl-chof-cedula').innerText = chof.cedula;
            if (document.getElementById('lbl-chof-correo')) document.getElementById('lbl-chof-correo').innerText = chof.correo;

            // =========================================================
            // 4. MOSTRAR TODA LA INFORMACIÓN ACTUAL OPERATIVA (Como la 2da Imagen)
            // =========================================================
            if (document.getElementById('lbl-chof-telefono-actual')) {
                document.getElementById('lbl-chof-telefono-actual').innerText = chof.telefono || 'No registrado';
            }
            if (document.getElementById('lbl-chof-banco-actual')) {
                document.getElementById('lbl-chof-banco-actual').innerText = chof.entidad_bancaria || 'No registrado';
            }
            if (document.getElementById('lbl-chof-cuenta-actual')) {
                document.getElementById('lbl-chof-cuenta-actual').innerText = chof.nro_cuenta || 'No registrada';
            }

            // Contactos de emergencia actuales mostrados en texto
            if (document.getElementById('lbl-chof-c1-actual')) document.getElementById('lbl-chof-c1-actual').innerText = chof.contacto_emergencia1 || 'No registrado';
            if (document.getElementById('lbl-chof-t1-actual')) document.getElementById('lbl-chof-t1-actual').innerText = chof.telefono_emergencia1 || 'No registrado';
            if (document.getElementById('lbl-chof-c2-actual')) document.getElementById('lbl-chof-c2-actual').innerText = chof.contacto_emergencia2 || 'No registrado';
            if (document.getElementById('lbl-chof-t2-actual')) document.getElementById('lbl-chof-t2-actual').innerText = chof.telefono_emergencia2 || 'No registrado';

           // =========================================================
// 5. CAMPOS DE MODIFICACIÓN PRE-CARGADOS CON DATOS ACTUALES
// =========================================================
if (document.getElementById('upd-chof-telefono')) document.getElementById('upd-chof-telefono').value = chof.telefono || '';
if (document.getElementById('upd-chof-banco')) document.getElementById('upd-chof-banco').value = chof.entidad_bancaria || '';
if (document.getElementById('upd-chof-cuenta')) document.getElementById('upd-chof-cuenta').value = chof.nro_cuenta || '';
if (document.getElementById('perf-chof-c1')) document.getElementById('perf-chof-c1').value = chof.contacto_emergencia1 || '';
if (document.getElementById('perf-chof-t1')) document.getElementById('perf-chof-t1').value = chof.telefono_emergencia1 || '';
if (document.getElementById('perf-chof-c2')) document.getElementById('perf-chof-c2').value = chof.contacto_emergencia2 || '';
if (document.getElementById('perf-chof-t2')) document.getElementById('perf-chof-t2').value = chof.telefono_emergencia2 || '';
            // =========================================================
            // 6. NOTAS DE EVALUACIÓN
            // =========================================================
            const txtNotaPsico = document.getElementById('chof-nota-psico') || document.querySelector('.eval-box p strong') || document.getElementById('nota-psicologica-view');
            if (txtNotaPsico) txtNotaPsico.innerText = `${chof.nota_psicologica || 0} / 100`;

            const txtFechaEval = document.getElementById('chof-fecha-evaluacion') || document.getElementById('fecha-tecnica-view');
            if (txtFechaEval) {
                txtFechaEval.innerText = chof.fecha_prueba ? new Date(chof.fecha_prueba).toLocaleDateString() : '-- / -- / ----';
            }

            // =========================================================
            // 7. RENDERIZAR TABLA O GRID DE VEHÍCULOS
            // =========================================================
            const gridVehiculos = document.getElementById('chof-grid-vehiculos') || document.getElementById('mis-autos-lista');
            if (gridVehiculos) {
                gridVehiculos.innerHTML = "";
                let totalCarreras = 0;

                if (data.vehiculos && data.vehiculos.length > 0) {
                    data.vehiculos.forEach(veh => {
                        totalCarreras += (veh.total_carreras || 0);
                        const rev = veh.calificacion_revision || 0;
                        const statusTexto = rev >= 65 ? 'Apto' : 'Revisión Pendiente';
                        
                        gridVehiculos.innerHTML += `
                            <div style="background: #fff; padding: 12px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); margin-bottom: 10px;">
                                <strong>🚗 ${veh.marca} ${veh.modelo}</strong> — <span style="font-size:12px; background:#eee; padding:2px 5px;">${veh.placa}</span>
                                <p style="margin:4px 0 0 0; font-size:12px; color:#555;">Revisión Anual: ${rev}/100 (${statusTexto})</p>
                            </div>`;
                    });
                } else {
                    gridVehiculos.innerHTML = `<p style="color:#777; font-size:13px;">No posees vehículos registrados todavía.</p>`;
                }

                const txtGlobalCarreras = document.getElementById('chof-total-viajes-global') || document.getElementById('total-carreras-view');
                if (txtGlobalCarreras) txtGlobalCarreras.innerText = totalCarreras;
            }
        }
    } catch (err) {
        console.error("Error cargando interfaz de chofer:", err);
    }
}
// =================================================================
// CORRECCIÓN: FUNCIÓN ACTUALIZAR EXPEDIENTE CHOFER EN TU FRONTEND
// =================================================================
// =================================================================
// FUNCIÓN ACTUALIZAR EXPEDIENTE CHOFER (SOLO MODIFICA LO QUE SE ESCRIBA)
// =================================================================
// =================================================================
// FUNCIÓN ACTUALIZAR EXPEDIENTE CHOFER (CON LIMPIEZA POST-GUARDADO)
// =================================================================
async function actualizarExpedienteChofer() {
    // 1. Capturamos los inputs de la interfaz
    const inputTelefono = document.getElementById('upd-chof-telefono')?.value.trim() || "";
    const inputBanco = document.getElementById('upd-chof-banco')?.value.trim() || "";
    const inputCuenta = document.getElementById('upd-chof-cuenta')?.value.trim() || "";
    const inputC1 = document.getElementById('perf-chof-c1')?.value.trim() || "";
    const inputT1 = document.getElementById('perf-chof-t1')?.value.trim() || "";
    const inputC2 = document.getElementById('perf-chof-c2')?.value.trim() || "";
    const inputT2 = document.getElementById('perf-chof-t2')?.value.trim() || "";

    // 2. Rescatamos los valores actuales de las etiquetas fijas si los inputs vienen vacíos
    const telefono = inputTelefono !== "" ? inputTelefono : (document.getElementById('lbl-chof-telefono-actual')?.innerText || "");
    const entidad_bancaria = inputBanco !== "" ? inputBanco : (document.getElementById('lbl-chof-banco-actual')?.innerText || "");
    const nro_cuenta = inputCuenta !== "" ? inputCuenta : (document.getElementById('lbl-chof-cuenta-actual')?.innerText || "");
    const c1 = inputC1 !== "" ? inputC1 : (document.getElementById('lbl-chof-c1-actual')?.innerText || "");
    const t1 = inputT1 !== "" ? inputT1 : (document.getElementById('lbl-chof-t1-actual')?.innerText || "");
    const c2 = inputC2 !== "" ? inputC2 : (document.getElementById('lbl-chof-c2-actual')?.innerText || "");
    const t2 = inputT2 !== "" ? inputT2 : (document.getElementById('lbl-chof-t2-actual')?.innerText || "");

    try {
        // 3. Petición al Servidor (REVISA SI ESTA RUTA COINCIDE EXACTAMENTE CON TU BACKEND)
        const res = await fetch(`${API_URL}/chofer/actualizar-expediente/${idUsuarioLogueado}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telefono, entidad_bancaria, nro_cuenta, c1, t1, c2, t2
            })
        });

        // Si la ruta responde 404 u otro error, lanzamos una excepción para controlarlo
        if (!res.ok) {
            throw new Error(`Código de respuesta del servidor: ${res.status}`);
        }

        const data = await res.json();
        
        if (data.success) {
            alert("¡Expediente actualizado con éxito!");
            await cargarDatosChofer(); // Recarga la información arriba en tiempo real
        } else {
            alert("Error al actualizar en Base de Datos: " + data.message);
        }

    } catch (err) {
        console.error("Error detallado:", err);
        alert("Error de conexión: No se pudo conectar con la ruta del servidor.");
    } finally {
        // =======================================================================
        // EL SECRETO: El bloque 'finally' se ejecuta SIEMPRE (con éxito o con error)
        // Esto vacía los cuadros inmediatamente y los deja limpios.
        // =======================================================================
        if (document.getElementById('upd-chof-telefono')) document.getElementById('upd-chof-telefono').value = '';
        if (document.getElementById('upd-chof-banco')) document.getElementById('upd-chof-banco').value = '';
        if (document.getElementById('upd-chof-cuenta')) document.getElementById('upd-chof-cuenta').value = '';
        if (document.getElementById('perf-chof-c1')) document.getElementById('perf-chof-c1').value = '';
        if (document.getElementById('perf-chof-t1')) document.getElementById('perf-chof-t1').value = '';
        if (document.getElementById('perf-chof-c2')) document.getElementById('perf-chof-c2').value = '';
        if (document.getElementById('perf-chof-t2')) document.getElementById('perf-chof-t2').value = '';
    }
}

async function cambiarPasswordChofer() {
    const contrasenaActual = document.getElementById('perf-chof-pass-actual').value;
    const contrasenaNueva = document.getElementById('perf-chof-pass-nueva').value;

    try {
        const res = await fetch(`${API_URL}/chofer/cambiar-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cuenta: idUsuarioLogueado, contrasenaActual, contrasenaNueva })
        });
        const data = await res.json();
        alert(data.message);
    } catch (err) {}
}

async function cargarTrasladosChofer() {
    const fInicio = document.getElementById('chof-fecha-inicio').value;
    const fFin = document.getElementById('chof-fecha-fin').value;

    try {
        const res = await fetch(`${API_URL}/chofer/traslados/${idUsuarioLogueado}?inicio=${fInicio}&fin=${fFin}`);
        const data = await res.json();

        if (data.success) {
            const tbodyP = document.getElementById('tabla-viajes-pendiente-body');
            const tbodyC = document.getElementById('tabla-viajes-cancelado-body');

            tbodyP.innerHTML = data.pendientes.length > 0 ? "" : `<tr><td colspan="4">No hay pendientes.</td></tr>`;
            data.pendientes.forEach(v => {
                tbodyP.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$${parseFloat(v.pago_chofer).toFixed(2)}</td></tr>`;
            });

            tbodyC.innerHTML = data.cancelados.length > 0 ? "" : `<tr><td colspan="4">No hay liquidados.</td></tr>`;
            data.cancelados.forEach(v => {
                tbodyC.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$${parseFloat(v.pago_chofer).toFixed(2)}</td></tr>`;
            });
        }
    } catch (err) {}
}

async function agregarNuevoVehiculo() {
    const marca = document.getElementById('add-veh-marca').value;
    const modelo = document.getElementById('add-veh-modelo').value;
    const placa = document.getElementById('add-veh-placa').value;
    const color = document.getElementById('add-veh-color').value;

    try {
        const res = await fetch(`${API_URL}/chofer/agregar-vehiculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cuenta: idUsuarioLogueado, marca, modelo, placa, color })
        });
        const data = await res.json();
        if (data.success) {
            alert("Vehículo agregado correctamente.");
            cargarDatosChofer();
        }
    } catch (err) {}
}

function cerrarSesion() {
    window.location.reload();
}