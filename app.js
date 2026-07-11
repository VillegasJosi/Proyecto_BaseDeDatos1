const API_URL = "http://localhost:3000/api";
let idUsuarioLogueado = null;

function mostrarPantalla(idPantalla) {
    const pantallas = ['vista-login', 'vista-registro-cliente', 'vista-registro-chofer', 'panel-cliente', 'panel-admin', 'panel-chofer', 'panel-espera-admision'];
    pantallas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('oculto');
    });
    const pantallaObjetivo = document.getElementById(idPantalla);
    if (pantallaObjetivo) pantallaObjetivo.classList.remove('oculto');
}

// =================================================================
// 1. LOGIN CON VALIDACIÓN DE ADMISIÓN (PERSONAL ADMINISTRATIVO)
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
                const notaPsico = parseFloat(datos.usuario.nota_psicologica || 0);
                const estatusAdmision = datos.usuario.estatus_admision || 'Aprobado'; // Si no viene explícito y ya tiene nota, asumimos listo u operando según tu BD
                const rangoMinimoPsico = 65.0;

                // VALIDACIÓN ESTRICTA: Solo va a espera si literalmente está pendiente o en proceso
                if (estatusAdmision === 'Pendiente' || estatusAdmision === 'En Proceso' || (notaPsico === 0 && estatusAdmision !== 'Aprobado')) {
                    mostrarPantalla('panel-espera-admision');
                    const txtEspera = document.getElementById('txt-mensaje-espera');
                    if (txtEspera) {
                        txtEspera.innerText = "⏳ En proceso de admisión por el personal administrativo. Tu evaluación psicológica y técnica está pendiente.";
                    }
                    return;
                }

                // Si ya fue evaluado pero no cumple el rango mínimo permitido
                if (notaPsico > 0 && notaPsico < rangoMinimoPsico) {
                    alert("No está permitido en el sistema: Tu puntaje psicológico no entra en el rango requerido de aprobación.");
                    mostrarPantalla('vista-login');
                    return;
                }

                // SI YA ESTÁ ADMITIDO Y APROBADO: Entra directo a su panel normal de chofer
                mostrarPantalla('panel-chofer'); 
                await cargarBancosDesplegable(); 
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
            alert("¡Postulación enviada! Quedas en proceso de admisión por el personal administrativo.");
            mostrarPantalla('vista-login');
        } else { alert("Error: " + data.message); }
    } catch (err) { alert("Error de conexión."); }
}

// =================================================================
// 3. ADMINISTRACIÓN (EVALUACIÓN POR PERSONAL ADMINISTRATIVO)
// =================================================================
async function guardarEvaluacionAdmin() {
    const id_chofer = document.getElementById('eval-id-chofer').value;
    const nota_psicologica = parseInt(document.getElementById('eval-nota-psico').value);
    const nota_vehiculo = parseInt(document.getElementById('eval-nota-vehiculo').value);
    const id_banco = document.getElementById('eval-id-banco').value;
    const nro_cuenta = document.getElementById('eval-nro-cuenta').value;

    if (nota_psicologica < 65) {
        alert("Aviso: La nota psicológica está por debajo del rango requerido (65). El chofer no será permitido en el sistema.");
    }

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
            document.getElementById('info-vehiculo-assigned').classList.remove('oculto');
        } else { alert(data.message); }
    } catch (err) {}
}

// =================================================================
// 5. CHOFER (INTERFAZ Y RESTRICCIÓN DE VEHÍCULOS)
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

async function cargarBancosDesplegable() {
    const selectBancos = document.getElementById('upd-chof-banco');
    if (!selectBancos) return;

    try {
        const respuesta = await fetch(`${API_URL}/bancos`);
        if (!respuesta.ok) throw new Error('No se pudo obtener la lista de bancos');
        
        const bancos = await respuesta.json();
        selectBancos.innerHTML = '<option value="">-- Seleccione un Banco --</option>';

        bancos.forEach(banco => {
            const option = document.createElement('option');
            option.value = banco.id_banco || banco.id;       
            option.textContent = banco.nombre_banco || banco.nombre; 
            selectBancos.appendChild(option);
        });
    } catch (error) {
        console.error('Error al rellenar el selector de bancos:', error);
    }
}

async function cargarDatosChofer() {
    if (!idUsuarioLogueado) return;
    try {
        const res = await fetch(`${API_URL}/chofer/perfil/${idUsuarioLogueado}`);
        if (!res.ok) return;

        const data = await res.json();
        
        if (data.success && data.chofer) {
            const chof = data.chofer;

            // ==========================================
            // 👇 AQUÍ VA EXACTAMENTE LO DE PSICOLOGÍA 👇
            // ==========================================
           // Reemplaza la sección del examen psicológico en cargarDatosChofer() por esto:
// ==========================================
            // 👇 CORRECCIÓN DEL SELECTOR PSICOLÓGICO 👇
            // ==========================================
            const elNotaPsico = document.getElementById('chof-nota-psico') || document.getElementById('chof-nota-psicologica') || document.getElementById('resultado-examen-psico-num') || document.querySelector('.card-resumen-psico span') || document.querySelector('#resultado-examen-psico');

            if (elNotaPsico && chof.nota_psicologica !== undefined) {
                elNotaPsico.innerText = `${chof.nota_psicologica} / 100`;
            }
if (chof.fecha_prueba) {
                const fechaEvaluacion = new Date(chof.fecha_prueba);
                
                // Sumamos 1 año exacto para la próxima evaluación
                const proximaEvaluacion = new Date(fechaEvaluacion);
                proximaEvaluacion.setFullYear(proximaEvaluacion.getFullYear() + 1);

                // 👇 Usamos el ID real que tienes en tu HTML de VS Code
                const elFechaPsico = document.getElementById('chof-fecha-evaluacion') || document.getElementById('chof-fecha-psico-texto') || document.getElementById('lbl-fecha-psicológica');
                
                if (elFechaPsico) {
                    elFechaPsico.innerHTML = `
                        ${fechaEvaluacion.toLocaleDateString()} 
                        <br><span style="font-size: 10px; color: var(--rosa-oscuro);">Próxima: ${proximaEvaluacion.toLocaleDateString()}</span>
                    `;
                }
            }
            // ==========================================
            // ==========================================
            // 👆 FIN DE LA SECCIÓN DE PSICOLOGÍA 👆
            // ==========================================

            const txtSaludo = document.getElementById('chof-nombre-saludo') || document.querySelector('.header-driver h2 span');
            if (txtSaludo) txtSaludo.innerText = chof.nombre || 'Conductor';

            const txtIdTop = document.getElementById('chof-id-cuenta-top') || document.querySelector('.header-driver p span') || document.getElementById('perf-id-cuenta');
            if (txtIdTop) txtIdTop.innerText = idUsuarioLogueado;

            const saldoFavor = chof.saldo_a_favor != null ? parseFloat(chof.saldo_a_favor) : 0.00;
            const txtSaldo = document.getElementById('chof-saldo-favor') || document.querySelector('.card-resumen h3') || document.querySelector('.card h3') || document.getElementById('saldo-acumulado-cobrar');
            if (txtSaldo) txtSaldo.innerText = `$${saldoFavor.toFixed(2)}`;

            if (document.getElementById('lbl-chof-nombre')) document.getElementById('lbl-chof-nombre').innerText = `${chof.nombre} ${chof.apellido}`;
            if (document.getElementById('lbl-chof-cedula')) document.getElementById('lbl-chof-cedula').innerText = chof.cedula;
            if (document.getElementById('lbl-chof-correo')) document.getElementById('lbl-chof-correo').innerText = chof.correo;

            if (document.getElementById('lbl-chof-telefono-actual')) document.getElementById('lbl-chof-telefono-actual').innerText = chof.telefono || 'No registrado';
            if (document.getElementById('lbl-chof-banco-actual')) document.getElementById('lbl-chof-banco-actual').innerText = chof.entidad_bancaria || 'No registrado';
            if (document.getElementById('lbl-chof-cuenta-actual')) document.getElementById('lbl-chof-cuenta-actual').innerText = chof.nro_cuenta || 'No registrada';

            if (document.getElementById('lbl-chof-c1-actual')) document.getElementById('lbl-chof-c1-actual').innerText = chof.contacto_emergencia1 || 'No registrado';
            if (document.getElementById('lbl-chof-t1-actual')) document.getElementById('lbl-chof-t1-actual').innerText = chof.telefono_emergencia1 || 'No registrado';
            if (document.getElementById('lbl-chof-c2-actual')) document.getElementById('lbl-chof-c2-actual').innerText = chof.contacto_emergencia2 || 'No registrado';
            if (document.getElementById('lbl-chof-t2-actual')) document.getElementById('lbl-chof-t2-actual').innerText = chof.telefono_emergencia2 || 'No registrado';

            const gridVehiculos = document.getElementById('chof-grid-vehiculos') || document.getElementById('mis-autos-lista');
            if (gridVehiculos) {
                gridVehiculos.innerHTML = "";
                let totalCarreras = 0;
                let tieneAutoApto = false;

                if (data.vehiculos && data.vehiculos.length > 0) {
                    data.vehiculos.forEach(veh => {
                        totalCarreras += (veh.total_carreras || 0);
                        const rev = veh.calificacion_revision || 0;
                        if (rev >= 65) tieneAutoApto = true;

                        const statusTexto = rev >= 65 ? 'Apto (Aprobado)' : (rev === 0 ? 'En espera de evaluación por personal administrativo' : 'No está permitido (Revisión no aprobada)');
                        const badgeColor = rev >= 65 ? 'background-color: var(--verde-pastel); color: #315c43;' : 'background-color: var(--rojo-pastel); color: #7c3a3a;';
                        
                        gridVehiculos.innerHTML += `
                            <div style="background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(255,183,197,0.05); position: relative;">
                                <strong style="color: var(--texto-color); display: block; margin-bottom: 6px;">🚗 ${veh.marca} ${veh.modelo}</strong>
                                <span style="font-size:12px; background: #fff0f2; color: var(--rosa-oscuro); padding: 3px 8px; border-radius: 6px; font-weight: bold;">${veh.placa}</span>
                                <p style="margin:12px 0 12px 0; font-size:12px; color:#706062;">
                                    Evaluación Vehicular: <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; ${badgeColor}">${rev}/100 - ${statusTexto}</span>
                                </p>
                                <button onclick="eliminarVehiculo(${veh.id_vehiculo})" style="background-color: #ffe6e8; color: #a63a50; border: 1px solid #f7c5cc; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;">
                                    🗑️ Eliminar Vehículo
                                </button>
                            </div>`;
                    });
                } else {
                    gridVehiculos.innerHTML = `<p style="color:#a69295; font-size:13px; font-style: italic; grid-column: span 2;">No posees vehículos registrados todavía.</p>`;
                }

                const bannerOperativo = document.getElementById('chof-banner-estado-operativo') || document.getElementById('banner-operativo-chofer');
                if (bannerOperativo) {
                    if (!tieneAutoApto) {
                        bannerOperativo.innerHTML = `<div style="background-color: var(--rojo-pastel); color: #7c3a3a; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; font-size: 13px;">⚠️ Alerta Operativa: Ningún cliente podrá solicitarte servicios de transporte hasta que tengas un auto registrado y aprobado con la calificación requerida por la administración.</div>`;
                    } else {
                        bannerOperativo.innerHTML = `<div style="background-color: var(--verde-pastel); color: #315c43; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; font-size: 13px;">✅ Tu unidad vehicular cumple con el rango requerido. Estás visible para los clientes.</div>`;
                    }
                }

                const txtGlobalCarreras = document.getElementById('chof-total-viajes-global') || document.getElementById('total-carreras-view');
                if (txtGlobalCarreras) txtGlobalCarreras.innerText = totalCarreras;
            }
        }
    } catch (err) {
        console.error("Error cargando interfaz de chofer:", err);
    }
}

async function eliminarVehiculo(idVehiculo) {
    if (!confirm("¿Estás seguro de que deseas eliminar este vehículo de tu flota?")) return;

    try {
        const res = await fetch(`${API_URL}/chofer/eliminar-vehiculo/${idVehiculo}`, {
            method: 'DELETE',
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Vehículo eliminado correctamente.");
            cargarDatosChofer(); // Recarga la interfaz de inmediato
        } else {
            alert("No se pudo eliminar el vehículo: " + data.message);
        }
    } catch (err) {
        console.error("Error de red al eliminar vehículo:", err);
        alert("Ocurrió un error al conectar con el servidor.");
    }
}

// =================================================================
// 6. ACCIONES Y NUEVO AUTO EN ESPERA
// =================================================================
async function actualizarExpedienteChofer() {
    const inputTelefono = document.getElementById('upd-chof-telefono')?.value.trim() || "";
    const inputBanco = document.getElementById('upd-chof-banco')?.value.trim() || ""; 
    const inputCuenta = document.getElementById('upd-chof-cuenta')?.value.trim() || "";
    const inputC1 = document.getElementById('perf-chof-c1')?.value.trim() || "";
    const inputT1 = document.getElementById('perf-chof-t1')?.value.trim() || "";
    const inputC2 = document.getElementById('perf-chof-c2')?.value.trim() || "";
    const inputT2 = document.getElementById('perf-chof-t2')?.value.trim() || "";

    const telefono = inputTelefono !== "" ? inputTelefono : (document.getElementById('lbl-chof-telefono-actual')?.innerText || "");
    const nro_cuenta = inputCuenta !== "" ? inputCuenta : (document.getElementById('lbl-chof-cuenta-actual')?.innerText || "");
    const c1 = inputC1 !== "" ? inputC1 : (document.getElementById('lbl-chof-c1-actual')?.innerText || "");
    const t1 = inputT1 !== "" ? inputT1 : (document.getElementById('lbl-chof-t1-actual')?.innerText || "");
    const c2 = inputC2 !== "" ? inputC2 : (document.getElementById('lbl-chof-c2-actual')?.innerText || "");
    const t2 = inputT2 !== "" ? inputT2 : (document.getElementById('lbl-chof-t2-actual')?.innerText || "");

    const entidad_bancaria = inputBanco !== "" ? inputBanco : null;

    try {
        const res = await fetch(`${API_URL}/chofer/actualizar-expediente/${idUsuarioLogueado}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono, entidad_bancaria, nro_cuenta, c1, t1, c2, t2 })
        });

        if (!res.ok) throw new Error(`Código de respuesta del servidor: ${res.status}`);

        const data = await res.json();
        if (data.success) {
            alert("¡Expediente actualizado con éxito!");
            await cargarDatosChofer(); 
        } else {
            alert("Error al actualizar: " + data.message);
        }
    } catch (err) {
        alert("Error de conexión con el servidor.");
    } finally {
        const inputsALimpiar = ['upd-chof-telefono', 'upd-chof-banco', 'upd-chof-cuenta', 'perf-chof-c1', 'perf-chof-t1', 'perf-chof-c2', 'perf-chof-t2'];
        inputsALimpiar.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    await cargarBancosDesplegable();
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
    if (!idUsuarioLogueado) return;

    const inputInicio = document.getElementById('chof-fecha-inicio').value;
    const inputFin = document.getElementById('chof-fecha-fin').value;

    const fInicio = inputInicio ? inputInicio : '2000-01-01';
    const fFin = inputFin ? inputFin : '2099-12-31';

    try {
        const res = await fetch(`${API_URL}/chofer/traslados/${idUsuarioLogueado}?inicio=${fInicio}&fin=${fFin}`);
        const data = await res.json();

        if (data.success) {
            const tbodyP = document.getElementById('tabla-viajes-pendiente-body');
            const tbodyC = document.getElementById('tabla-viajes-cancelado-body');
            const tbodyCE = document.getElementById('tabla-viajes-cancelados-empresa-body');

            if (tbodyP) {
                tbodyP.innerHTML = data.pendientes.length > 0 ? "" : `<tr><td colspan="4" style="text-align:center; color:#a69295; font-style:italic;">No hay carreras pendientes en este rango.</td></tr>`;
                data.pendientes.forEach(v => {
                    tbodyP.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$${parseFloat(v.pago_chofer).toFixed(2)}</td></tr>`;
                });
            }

            if (tbodyC) {
                tbodyC.innerHTML = data.cancelados.length > 0 ? "" : `<tr><td colspan="4" style="text-align:center; color:#a69295; font-style:italic;">No hay carreras liquidadas en este rango.</td></tr>`;
                data.cancelados.forEach(v => {
                    tbodyC.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$${parseFloat(v.pago_chofer).toFixed(2)}</td></tr>`;
                });
            }

            // 👇 Se asegura de actualizar únicamente el contenedor propio de esta tabla
            if (tbodyCE) {
                tbodyCE.innerHTML = data.canceladosEmpresa.length > 0 ? "" : `<tr><td colspan="4" style="text-align:center; color:#a69295; font-style:italic;">No hay traslados cancelados por la empresa en este rango.</td></tr>`;
                data.canceladosEmpresa.forEach(v => {
                    tbodyCE.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$0.00</td></tr>`;
                });
            }
        }
    } catch (err) {
        console.error("Error de red cargando traslados:", err);
    }
}

// NUEVO AUTO: Queda en espera de evaluación por el personal administrativo
async function agregarNuevoVehiculo() {
    const marca = document.getElementById('add-veh-marca').value;
    const modelo = document.getElementById('add-veh-modelo').value;
    const placa = document.getElementById('add-veh-placa').value;
    const color = document.getElementById('add-veh-color').value;

    try {
        const res = await fetch(`${API_URL}/chofer/agregar-vehiculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Cambiamos 'id_cuenta' por 'id_chofer' si tu backend o BD manejan ese nombre, 
            // o dejamos ambos/el correcto que espera tu server.js:
            body: JSON.stringify({ 
                id_chofer: idUsuarioLogueado, 
                // Enviamos ambos para evitar cualquier conflicto de nombres
                marca, 
                modelo, 
                placa, 
                color 
            })
        });
        const data = await res.json();
        if (data.success) {
            alert("Vehículo agregado correctamente. Quedará en espera de evaluación por el personal administrativo.");
            cargarDatosChofer();
        } else {
            alert("No está permitido registrar el vehículo: " + data.message);
        }
    } catch (err) {
        console.error("Error al registrar vehículo:", err);
    }
}

async function eliminarVehiculo(idVehiculo) {
    if (!confirm("¿Estás seguro de que deseas eliminar este vehículo?")) return;

    try {
        const response = await fetch(`http://localhost:3000/api/chofer/eliminar-vehiculo/${idVehiculo}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
            alert("Vehículo eliminado con éxito.");
            cargarDatosChofer(); // O la función que recargue los datos del panel
        } else {
            alert("No se pudo eliminar: " + data.message);
        }
    } catch (error) {
        console.error("Error al eliminar vehículo:", error);
    }
}

function cerrarSesion() {
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del DOM
});