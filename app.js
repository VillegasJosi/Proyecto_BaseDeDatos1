//const API_URL = "http://localhost:3000/api";
let idUsuarioLogueado = null;
let idViajeActual = null; // <--- AGREGA ESTA LÍNEA AQUÍ
const API_URL = 'http://localhost:3000';

// Helper: fetch con timeout para evitar bloqueos en la UI
async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const resp = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return resp;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}
// =================================================================
// 1. INICIALIZACIÓN
// =================================================================
// Auto-ejecutable al cargar la página para evitar pantalla en blanco
function inicializarApp() {
    // Si tienes una función para mostrar el login, llámala aquí:
    if (typeof mostrarPantalla === 'function') {
        mostrarPantalla('vista-login');
    } else {
        const loginEl = document.getElementById('vista-login');
        if (loginEl) {
            loginEl.classList.remove('oculto');
        }
    }

    const btnAbrirCancelar = document.getElementById('btn-abrir-cancelar');
    if (btnAbrirCancelar) {
        btnAbrirCancelar.addEventListener('click', () => abrirModalCancelar());
    }

    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    if (btnConfirmCancel) {
        btnConfirmCancel.addEventListener('click', confirmarCancelacion);
    }

    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModal);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}




// =================================================================
// 1. LOGIN CON VALIDACIÓN DE ADMISIÓN (PERSONAL ADMINISTRATIVO)
// =================================================================
// =================================================================
// 1. LOGIN CON VALIDACIÓN DE ADMISIÓN (PERSONAL ADMINISTRATIVO)
// =================================================================
async function iniciarSesion() {
    const correo = document.getElementById('correo').value;
    const contrasena = document.getElementById('contrasena').value;
    console.log("¡El botón fue presionado!"); // <--- AGREGA ESTO
 

    if (!correo || !contrasena) {
        alert("Por favor, llena todos los campos.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/login`, {  // Aquí declaras la variable 'res'
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contrasena })
        });
        
        // CORRECCIÓN AQUÍ: Cambia 'respuesta' por 'res'
        const datos = await res.json();

        if (datos.success) {
            idUsuarioLogueado = datos.usuario.id_usuario;  
            const tipoUsuario = datos.usuario.tipo_usuario;
            const rol = tipoUsuario ? tipoUsuario.toLowerCase() : "";
            console.log("El tipo de usuario que llegó es:", tipoUsuario);

            // ADMINISTRATIVO
            if (rol.includes('admin') || rol.includes('administrativo')) {
                mostrarPantalla('panel-admin');
                if (typeof cargarReportesFinancieros === 'function') cargarReportesFinancieros(); 
                if (typeof cargarVehiculosPendientes === 'function') cargarVehiculosPendientes();
            } 
           // CHOFER
          // CHOFER
            else if (tipoUsuario && tipoUsuario.toLowerCase() === 'chofer') {
                const estatusChofer = datos.usuario.estatus ? datos.usuario.estatus.trim().toUpperCase() : 'PENDIENTE';

                // ESTADOS: PENDIENTE O EN ESPERA
                if (estatusChofer === 'PENDIENTE' || estatusChofer === 'EN ESPERA') {
                    mostrarPantalla('panel-espera-admision');
                    const txtEspera = document.getElementById('txt-mensaje-espera');
                    if(txtEspera) txtEspera.innerText = "⏳ Tu postulación o datos están siendo evaluados por el personal administrativo.";
                    return;
                } 
                
                // ESTADO: REPROBADO O RECHAZADO
                if (estatusChofer === 'REPROBADO' || estatusChofer === 'RECHAZADO') {
                    mostrarPantalla('panel-espera-admision');
                    const txtEspera = document.getElementById('txt-mensaje-espera');
                    if(txtEspera) {
                        const notaPsico = datos.usuario.nota_psicologica ?? datos.usuario.psicologica ?? 17; 
                        const notaVeh = datos.usuario.nota_vehiculo ?? datos.usuario.vehiculo ?? 95;
                        txtEspera.innerHTML = `❌ Lamentablemente tu postulación ha sido REPROBADA.<br><br>` +
                                             `• Prueba Psicológica: <strong>${notaPsico}</strong> / 100<br>` +
                                             `• Inspección de Vehículo: <strong>${notaVeh}</strong> / 100`;
                    }
                    return;
                }

                // ==========================================
                // SI ESTÁ APROBADO: Forzamos la visualización limpia
                // ==========================================
                
                // 1. Ocultar la vista de login de forma directa
                const vistaLogin = document.getElementById('vista-login');
                if (vistaLogin) vistaLogin.classList.add('oculto');

                // 2. Buscar y mostrar el panel de chofer quitándole el 'oculto'
                const panelChofer = document.getElementById('panel-chofer');
                if (panelChofer) {
                    panelChofer.classList.remove('oculto');
                    console.log("¡Panel de chofer forzado a mostrarse con éxito!");
                } else {
                    console.error("ERROR: No se encontró el elemento id='panel-chofer' en el DOM.");
                }

                // 3. Cargar las funciones secundarias de forma segura
                if (typeof cargarBancosDesplegable === 'function') {
                    await cargarBancosDesplegable().catch(err => console.error("Error en bancos:", err));
                }  
                if (typeof cargarDatosChofer === 'function') {
                    await cargarDatosChofer().catch(err => console.error("Error en datos chofer:", err));
                }
            }
            // CLIENTE
            else if (tipoUsuario === 'Cliente') {
                mostrarPantalla('panel-cliente');
                const saldoEl = document.getElementById('saldo-cliente');
                if (saldoEl) {
                    saldoEl.innerText = `$${parseFloat(datos.usuario.saldo || 0).toFixed(2)}`;
                }
                if (typeof cargarDatosCliente === 'function') {
                    await cargarDatosCliente();
                }
                if (typeof cargarHistorialRecargas === 'function') cargarHistorialRecargas();
                if (typeof cambiarTabPerfilCliente === 'function') cambiarTabPerfilCliente('cli-tab-inicio');
            }
        } else {
            alert("Error: " + datos.message);
        }
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
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
        const res = await fetch(`${API_URL}/api/registro-cliente`, {
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
    const id_banco = document.getElementById('reg-chof-banco').value;
    const nro_cuenta = document.getElementById('reg-chof-nrocuenta').value;

    try {
        const res = await fetch(`${API_URL}/api/registro-chofer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre, apellido, cedula, telefono, correo, contrasena, 
                marca, modelo, placa, color, contacto_emergencia1, 
                telefono_emergencia1, contacto_emergencia2, telefono_emergencia2, 
                id_banco, nro_cuenta 
            })
        });

        const data = await res.json();

        if (data.success) {
            alert(data.message);
            mostrarPantalla('vista-login');
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Error de conexión.");
    }
}

// =================================================================
// 3. ADMINISTRACIÓN (EVALUACIÓN Y REPORTES FINANCIEROS)
// =================================================================
async function guardarEvaluacionAdmin() {
    const id_chofer = document.getElementById('eval-id-chofer').value;
    const nota_psicologica = parseInt(document.getElementById('eval-nota-psico').value);
    const nota_vehiculo = parseInt(document.getElementById('eval-nota-vehiculo').value);
    
    // Validamos que los elementos existan o tomamos cadena vacía de forma segura
    const id_banco = document.getElementById('eval-id-banco') ? document.getElementById('eval-id-banco').value : '';
    const nro_cuenta = document.getElementById('eval-nro-cuenta') ? document.getElementById('eval-nro-cuenta').value : '';

    if (!id_chofer || isNaN(nota_psicologica) || isNaN(nota_vehiculo)) {
        alert("Por favor completa los campos obligatorios de identificación y notas.");
        return;
    }

    // Permitimos evaluar cualquier rango lógico (0 a 100), sin bloquear el envío si reprueba
    if (nota_psicologica < 0 || nota_psicologica > 100 || nota_vehiculo < 0 || nota_vehiculo > 100) {
        alert("⚠️ Las calificaciones deben estar comprendidas entre 0 y 100.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/evaluar-chofer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_chofer, nota_psicologica, nota_vehiculo, id_banco, nro_cuenta })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert(data.message); // Muestra tanto si aprobó como el mensaje de REPROBADO con la ❌
            if (typeof cargarVehiculosPendientes === 'function') {
                cargarVehiculosPendientes();
            }
        } else {
            alert("Error: " + (data.error || "No se pudo procesar la evaluación."));
        }
    } catch (err) {  
        console.error("Error al registrar:", err);
        alert("Error de red al conectar con el servidor.");  
    }
}
async function cargarReportesFinancieros() {
    try {
        const res = await fetch(`${API_URL}/api/admin/reportes-financieros`);
        const data = await res.json();
        
        if (data.success) {
            if(document.getElementById('ganancia-empresa-total')) {
                document.getElementById('ganancia-empresa-total').innerText = `$${parseFloat(data.totalGanancia || 0).toFixed(2)}`;
            }
            if(document.getElementById('saldo-clientes-total')) {
                document.getElementById('saldo-clientes-total').innerText = `$${parseFloat(data.totalCustodia || 0).toFixed(2)}`;
            }

            const tbodyPagos = document.getElementById('tabla-carreras-pagadas');
            if (tbodyPagos) {
                tbodyPagos.innerHTML = '';
                const listaPagos = data.pagos || data.liquidados || [];

                if (listaPagos.length === 0) {
                    tbodyPagos.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No hay carreras liquidadas en este rango.</td></tr>`;
                } else {
                    listaPagos.forEach(item => {
                        const montoItem = parseFloat(item.monto_pagado || item.monto || 0);
                        const fechaFormateada = item.fecha_pago ? new Date(item.fecha_pago).toLocaleDateString() : 'N/D';

                        tbodyPagos.innerHTML += `
                            <tr>
                                <td>${fechaFormateada}</td>
                                <td>${item.origen || 'N/D'}</td>
                                <td>${item.destino || 'N/D'}</td>
                                <td>$${montoItem.toFixed(2)}</td>
                            </tr>
                        `;
                    });
                }
            }
        }
    } catch (err) {
        console.error("Error al cargar reportes financieros:", err);
    }
}

async function ejecutarPagoChofer() {
    const inputChofer = document.getElementById('adm-pago-id-chofer');
    const inputMonto = document.getElementById('adm-monto-pagar');
    const inputRef = document.getElementById('adm-ref-pago');

    if (!inputChofer || !inputMonto || !inputRef) {
        alert("Error de interfaz: Faltan elementos en el formulario.");
        return;
    }

    const id_chofer = inputChofer.value;
    const monto = inputMonto.value;
    const nro_referencia = inputRef.value;

    if (!id_chofer || !monto || !nro_referencia) {
        alert("Por favor completa todos los campos de la liquidación.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/pagar-chofer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_chofer, monto, nro_referencia })
        });
        const data = await res.json();
        
        if (data.success) { 
            alert("Pago registrado correctamente."); 
            if (typeof cargarReportesFinancieros === 'function') {
                cargarReportesFinancieros(); 
            }
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) { 
        console.error("Error de red:", err);
        alert("Error de conexión con el servidor."); 
    }
}

// =================================================================
// 4. CLIENTE
// =================================================================
async function ejecutarRecargaSaldo() {
    const monto = document.getElementById('recarga-monto').value;
    const nro_referencia = document.getElementById('recarga-referencia').value;
    const banco = document.getElementById('recarga-banco').value;

    try {
        const res = await fetch(`${API_URL}/api/recargar-saldo`, {
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
        console.log('Invocado cargarHistorialRecargas()');
        const inicioInput = document.getElementById('cli-recargas-fecha-inicio').value;
        const finInput = document.getElementById('cli-recargas-fecha-fin').value;
        
        console.log('Filtros recargas:', { inicioInput, finInput, idUsuarioLogueado });

        if (!idUsuarioLogueado) {
            alert('No se ha detectado sesión de cliente.');
            return;
        }

        const params = [];
        if (inicioInput) params.push(`inicio=${encodeURIComponent(inicioInput)}`);
        if (finInput) params.push(`fin=${encodeURIComponent(finInput)}`);

        let url = `${API_URL}/api/historial-recargas/${idUsuarioLogueado}`;
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        console.log('Solicitud historial-recargas URL:', url);

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        console.log('Historial recargas recibido:', data);

        const tbody = document.getElementById('tabla-recargas-body');
        if (!tbody) return;
        tbody.innerHTML = "";

        // Validamos que sea exitoso y que data.recargas contenga elementos
        if (data.success && Array.isArray(data.recargas) && data.recargas.length > 0) {
            data.recargas.forEach(rec => {
                const fecha = rec.fecha_recarga ? new Date(rec.fecha_recarga).toLocaleDateString() : 'Sin fecha';
                const banco = rec.nombre_banco || rec.banco_origin || 'N/A';
                const referencia = rec.nro_referencia || rec.referencia || 'N/A';
                const montoNum = rec.monto !== undefined && rec.monto !== null ? parseFloat(rec.monto) : NaN;
                const montoTexto = isNaN(montoNum) ? 'N/A' : `$${montoNum.toFixed(2)}`;

                tbody.innerHTML += `<tr><td style="padding:8px">${fecha}</td><td style="padding:8px">${banco}</td><td style="padding:8px">${referencia}</td><td style="padding:8px">${montoTexto}</td></tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#6b7280">No hay recargas registradas en este rango.</td></tr>';
        }
    } catch (err) {
        console.error('Error cargando historial de recargas:', err);
        const tbody = document.getElementById('tabla-recargas-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:#6b7280">Error al cargar historial.</td></tr>';
    }
}

async function enviarRecargaCliente() {
    const monto = document.getElementById('cli-monto-pago')?.value;
    const nro_referencia = document.getElementById('cli-ref-pago')?.value;
    const banco = document.getElementById('cli-banco-pago')?.value;

    if (!monto || !nro_referencia || !banco) {
        alert('Por favor completa todos los campos de la recarga.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/recargar-saldo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idUsuarioLogueado, monto, nro_referencia, banco })
        });
        const data = await res.json();
        if (data.success) {
            alert('Recarga registrada correctamente.');
            const saldoEl = document.getElementById('cli-saldo-actual');
            if (saldoEl) saldoEl.innerText = `$${data.nuevoSaldo.toFixed(2)}`;
            if (typeof cargarHistorialRecargas === 'function') cargarHistorialRecargas();
        } else {
            alert('Error: ' + (data.message || 'No se pudo procesar la recarga.'));
        }
    } catch (err) {
        console.error('Error al enviar recarga:', err);
        alert('No se pudo conectar con el servidor.');
    }
}

async function cargarDatosCliente() {
    if (!idUsuarioLogueado) return;

    try {
        const res = await fetch(`${API_URL}/api/cliente/perfil/${idUsuarioLogueado}`);
        const data = await res.json();

        if (!data.success) {
            console.error("Error al cargar perfil del cliente:", data.message);
            return;
        }

        const cliente = data.cliente || {};
        const nombreCompleto = `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();

        const setTxt = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.innerText = valor;
        };

        setTxt('cli-nombre-usuario', nombreCompleto || 'Cliente');
        setTxt('cli-correo-usuario', cliente.correo || 'cliente@email.com');
        setTxt('lbl-cli-nombre', nombreCompleto || 'Cliente');
        setTxt('lbl-cli-cedula', cliente.cedula || '--');
        setTxt('lbl-cli-correo', cliente.correo || '--');
        setTxt('lbl-cli-telefono-actual', cliente.telefono || 'No registrado');
        setTxt('lbl-cli-direccion-actual', cliente.direccion_frecuente || 'No registrada');

        const saldoEl = document.getElementById('cli-saldo-actual');
        if (saldoEl) {
            const saldo = parseFloat(cliente.saldo_usuario || 0);
            saldoEl.innerText = `$${isNaN(saldo) ? '0.00' : saldo.toFixed(2)}`;
        }

        const inputTelefono = document.getElementById('upd-cli-telefono');
        if (inputTelefono && !inputTelefono.value) {
            inputTelefono.value = cliente.telefono || '';
        }

        const inputDireccion = document.getElementById('upd-cli-direccion');
        if (inputDireccion && !inputDireccion.value) {
            inputDireccion.value = cliente.direccion_frecuente || '';
        }

        await cargarHistorialCliente();
    } catch (err) {
        console.error("ERROR CRÍTICO EN cargarDatosCliente:", err);
    }
}

async function cargarHistorialCliente() {
    if (!idUsuarioLogueado) return;

    const tbody = document.getElementById('cli-tabla-historial-body');
    if (!tbody) return;

    const fechaInicio = document.getElementById('cli-fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('cli-fecha-fin')?.value || '';

    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando historial...</td></tr>';

    try {
        const query = new URLSearchParams();
        if (fechaInicio) query.append('inicio', fechaInicio);
        if (fechaFin) query.append('fin', fechaFin);

        const res = await fetch(`${API_URL}/api/cliente/historial/${idUsuarioLogueado}?${query.toString()}`);
        const text = await res.text();
        let data = { success: false, message: 'No se pudo cargar el historial.' };

        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error('Respuesta no JSON del historial del cliente:', text);
        }

        if (!res.ok || !data.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">${data.message || 'No se pudo cargar el historial.'}</td></tr>`;
            return;
        }

        const viajes = data.viajes || [];
        if (viajes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No tienes viajes registrados recientemente.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        viajes.forEach(viaje => {
            const fecha = viaje.fecha_traslado ? new Date(viaje.fecha_traslado).toLocaleDateString() : 'Sin fecha';
            const ruta = `${viaje.punto_A || 'N/A'} ➡️ ${viaje.punto_B || 'N/A'}`;
            const chofer = viaje.nombre_chofer ? `${viaje.nombre_chofer} ${viaje.apellido_chofer || ''}`.trim() : 'Por asignar';
            const costo = parseFloat(viaje.costo_total || 0).toFixed(2);
            const estado = viaje.estado || 'Completado';
            const badgeColor = estado === 'Cancelado' ? '#ef4444' : estado === 'Pendiente' ? '#f59e0b' : '#10b981';

            tbody.innerHTML += `
                <tr style="border-top:1px solid #f3f4f6;">
                    <td style="padding:10px 8px;">${fecha}</td>
                    <td style="padding:10px 8px; font-weight:600; color:#111827;">${ruta}</td>
                    <td style="padding:10px 8px; color:#4b5563;">${chofer}</td>
                    <td style="padding:10px 8px; font-weight:700; color:#111827;">$${costo}</td>
                    <td style="padding:10px 8px;"><span style="display:inline-block; padding:4px 8px; border-radius:999px; background:${badgeColor}22; color:${badgeColor}; font-size:12px; font-weight:700;">${estado}</span></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Error cargando historial del cliente:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No se pudo cargar el historial.</td></tr>';
    }
}

async function guardarPerfilCliente() {
    const inputTelefono = document.getElementById('upd-cli-telefono')?.value.trim() || "";
    const inputDireccion = document.getElementById('upd-cli-direccion')?.value.trim() || "";

    const telefonoActual = document.getElementById('lbl-cli-telefono-actual')?.innerText?.trim() || "";
    const direccionActual = document.getElementById('lbl-cli-direccion-actual')?.innerText?.trim() || "";

    const telefono = inputTelefono !== "" ? inputTelefono : (telefonoActual !== "No registrado" ? telefonoActual : "");
    const direccion_frecuente = inputDireccion !== "" ? inputDireccion : (direccionActual !== "No registrada" ? direccionActual : "");

    try {
        const res = await fetch(`${API_URL}/api/cliente/actualizar-perfil/${idUsuarioLogueado}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telefono, direccion_frecuente })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'No se pudo actualizar el perfil');
        }

        alert('¡Perfil actualizado con éxito!');
        await cargarDatosCliente();

        const inputs = ['upd-cli-telefono', 'upd-cli-direccion'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    } catch (err) {
        console.error(err);
        alert('No se pudo actualizar el perfil del cliente.');
    }
}

async function cambiarPasswordCliente() {
    const contrasenaActual = document.getElementById('cli-pass-actual').value;
    const contrasenaNueva = document.getElementById('cli-pass-nueva').value;

    try {
        const res = await fetch(`${API_URL}/api/cliente/cambiar-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cuenta: idUsuarioLogueado, contrasenaActual, contrasenaNueva })
        });

        const data = await res.json();
        alert(data.message || 'Operación completada.');

        if (data.success) {
            document.getElementById('cli-pass-actual').value = '';
            document.getElementById('cli-pass-nueva').value = '';
        }
    } catch (err) {
        alert('No se pudo actualizar la contraseña.');
    }
}

async function solicitarTrasladoReal() {
    const origen = document.getElementById('viaje-origen').value;
    const destino = document.getElementById('viaje-destino').value;

    try {
        const res = await fetch(`${API_URL}/api/solicitar-traslado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cliente: idUsuarioLogueado, origen, destino })
        });
        const data = await res.json();

        if (data.success) {
            idViajeActual = data.id_traslado || data.id_viaje || null;
            console.log("ID guardado correctamente:", idViajeActual);

            const chofer = data.chofer || {};
            const choferNombre = `${chofer.nombre || ''} ${chofer.apellido || ''}`.trim() || 'Chofer asignado';
            const vehiculoTexto = `${chofer.marca || ''} ${chofer.modelo || ''}`.trim() || 'Vehículo asignado';
            const costoTexto = typeof data.costoViaje === 'number' ? data.costoViaje : parseFloat(data.costoViaje || 0);

            const displayChofer = document.getElementById('display-chofer');
            const displayVehiculo = document.getElementById('display-vehiculo');
            const displayCosto = document.getElementById('display-costo');
            const cardViajeActivo = document.getElementById('card-viaje-activo');

            if (displayChofer) displayChofer.innerText = choferNombre;
            if (displayVehiculo) displayVehiculo.innerText = vehiculoTexto;
            if (displayCosto) displayCosto.innerText = costoTexto.toFixed(2);
            if (cardViajeActivo) {
                cardViajeActivo.classList.remove('oculto');
                if (idViajeActual) cardViajeActivo.dataset.viajeId = idViajeActual;
            }
            const btnAbrirCancelar = document.getElementById('btn-abrir-cancelar');
            if (btnAbrirCancelar && idViajeActual) {
                btnAbrirCancelar.dataset.viajeId = idViajeActual;
            }
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error("Error al solicitar:", err);
    }
}

function mostrarPantalla(idPanel) {
    // 1. Ocultamos todos los contenedores primero
   // Cambia la línea 1061 por esta:
   document.querySelectorAll('.panel, .contenedor-card, div[id^="panel-"], div[id^="vista-"]').forEach(panel => {
    panel.classList.add('oculto');
   });

    // 2. Mostramos solo el que queremos
    const panel = document.getElementById(idPanel);
    if (panel) {
        panel.classList.remove('oculto');
    }
}

// =================================================================
// 5. CHOFER (INTERFAZ Y GESTIÓN DE FLOTA / PERFIL)
// =================================================================
function cambiarTabChofer(idTabDestino) {
    // 1. Ocultar todos los contenidos de las pestañas de chofer
    const contenidos = document.querySelectorAll('.tab-content-chof');
    contenidos.forEach(c => c.classList.add('oculto'));

    // 2. Remover la clase activa de todos los botones de las pestañas
    const botones = document.querySelectorAll('.tabs-container .tab-btn');
    if (botones.forEach) botones.forEach(b => b.classList.remove('active-tab'));

    // 3. Mostrar la pestaña seleccionada
    const tabSeleccionada = document.getElementById(idTabDestino);
    if (tabSeleccionada) {
        tabSeleccionada.classList.remove('oculto');
    }

    // 4. Activar visualmente el botón correspondiente
    // Relación ID de pestaña con botón
    let btnId = '';
    if (idTabDestino === 'chof-tab-resumen') btnId = 'btn-tab-resumen';
    else if (idTabDestino === 'chof-tab-autos') btnId = 'btn-tab-autos';
    else if (idTabDestino === 'chof-tab-viajes') btnId = 'btn-tab-viajes';
    else if (idTabDestino === 'chof-tab-perfil') btnId = 'btn-tab-perfil';

    const btnActivo = document.getElementById(btnId);
    if (btnActivo) {
        btnActivo.classList.add('active-tab');
    }
}

async function cargarBancosDesplegable() {
    const selectBancos = document.getElementById('upd-chof-banco');
    if (!selectBancos) return;

    try {
        const respuesta = await fetch(`${API_URL}/api/bancos`);
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
        const res = await fetch(`${API_URL}/api/chofer/perfil/${idUsuarioLogueado}`);
        const data = await res.json();
        
        if (!data.success) {
            console.error("Error al cargar perfil:", data.message);
            return;
        }

        if (typeof cargarViajesChofer === 'function') {
    cargarViajesChofer();
}

        const chof = data.chofer;

        // 1. LLAMAMOS A MOSTRAR PANEL AQUÍ
        mostrarPantalla('panel-chofer');

        // 2. Datos personales y métricas
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        
        setTxt('chof-nombre-saludo', chof.nombre || 'Conductor');
        setTxt('lbl-chof-nombre', `${chof.nombre || ''} ${chof.apellido || ''}`);
        setTxt('lbl-chof-cedula', chof.cedula || '');
        setTxt('lbl-chof-correo', chof.correo || '');
        setTxt('lbl-chof-telefono-actual', chof.telefono || 'No registrado');
        setTxt('lbl-chof-banco-actual', chof.entidad_bancaria || 'No registrado');
        setTxt('lbl-chof-cuenta-actual', chof.nro_cuenta || 'No registrada');
        setTxt('lbl-chof-c1-actual', chof.contacto_emergencia1 || 'No registrado');
        setTxt('lbl-chof-t1-actual', chof.telefono_emergencia1 || 'No registrado');
        setTxt('lbl-chof-c2-actual', chof.contacto_emergencia2 || 'No registrado');
        setTxt('lbl-chof-t2-actual', chof.telefono_emergencia2 || 'No registrado');

        // Métricas corregidas con las variables reales del servidor
        const saldoFavorNum = typeof chof.saldo_a_favor === 'number' ? chof.saldo_a_favor : parseFloat(chof.saldo_a_favor || 0);
        setTxt('chof-saldo-favor', `$${(isNaN(saldoFavorNum) ? 0 : saldoFavorNum).toFixed(2)}`);
        setTxt('chof-total-viajes-global', data.totalCarrerasGlobal || 0);
        setTxt('chof-nota-psico', `${chof.nota_psicologica || 0} / 100`);
        setTxt('chof-fecha-psico-texto', chof.fecha_prueba ? new Date(chof.fecha_prueba).toLocaleDateString() : 'No evaluado');
        
        // ID de cuenta superior
        setTxt('chof-id-cuenta', `#${chof.id_usuario || idUsuarioLogueado}`);

        // 3. Procesamiento de Vehículos
        const gridVehiculos = document.getElementById('chof-grid-vehiculos') || document.getElementById('mis-autos-lista');
        if (gridVehiculos) {
            gridVehiculos.innerHTML = "";
            let tieneAutoApto = false;

            if (data.vehiculos && data.vehiculos.length > 0) {
                data.vehiculos.forEach(veh => {
                    const nota = veh.calificacion_revision !== null && veh.calificacion_revision !== undefined
                        ? Number(veh.calificacion_revision)
                        : null;

                    let estadoTexto = 'Pendiente';
                    let icono = '⏳';
                    let color = '#f59e0b';

                    if (nota === null) {
                        estadoTexto = 'Pendiente';
                        icono = '⏳';
                        color = '#f59e0b';
                    } else if (nota >= 65) {
                        estadoTexto = 'Aprobado';
                        icono = '✅';
                        color = '#10b981';
                        tieneAutoApto = true;
                    } else {
                        estadoTexto = 'Rechazado';
                        icono = '❌';
                        color = '#ef4444';
                    }

                    gridVehiculos.innerHTML += `
                        <div style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #ddd; margin-bottom: 10px;">
                            <strong>🚗 ${veh.marca} ${veh.modelo}</strong> - Placa: ${veh.placa}
                            <p style="margin:10px 0 0; color:${color}; font-weight:600;">Evaluación: ${icono} ${estadoTexto}${nota !== null ? ` (${nota} pts)` : ''}</p>
                            <button onclick="eliminarVehiculo(${veh.id_vehiculo})">Eliminar</button>
                        </div>`;
                });
            } else {
                gridVehiculos.innerHTML = '<p>No hay vehículos registrados.</p>';
            }
        }

    } catch (err) {
        console.error("ERROR CRÍTICO EN cargarDatosChofer:", err);
    }
}
// 6. GESTIÓN DE TRASLADOS, VEHÍCULOS Y PERFIL (CHOFER/ADMIN)
// =================================================================
async function cargarTrasladosChofer() {
    if (!idUsuarioLogueado) return;

    const inputInicio = document.getElementById('chof-fecha-inicio')?.value;
    const inputFin = document.getElementById('chof-fecha-fin')?.value;

    const fInicio = inputInicio ? inputInicio : '2000-01-01';
    const fFin = inputFin ? inputFin : '2099-12-31';

    try {
        const res = await fetch(`${API_URL}/api/chofer/traslados/${idUsuarioLogueado}?inicio=${fInicio}&fin=${fFin}`);
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

            if (tbodyCE) {
                tbodyCE.innerHTML = data.canceladosEmpresa.length > 0 ? "" : `<tr><td colspan="4" style="text-align:center; color:#a69295; font-style:italic;">No hay traslados cancelados por la empresa en este rango.</td></tr>`;
                data.canceladosEmpresa.forEach(v => {
                    const montoEmpresa = parseFloat(v.pago_chofer || 0);
                    tbodyCE.innerHTML += `<tr><td>${new Date(v.fecha_traslado).toLocaleDateString()}</td><td>${v.origen}</td><td>${v.destino}</td><td>$${montoEmpresa.toFixed(2)}</td></tr>`;
                });
            }
        }
    } catch (err) {
        console.error("Error de red cargando traslados:", err);
    }
}

async function agregarNuevoVehiculo() {
    const marca = document.getElementById('add-veh-marca')?.value;
    const modelo = document.getElementById('add-veh-modelo')?.value;
    const placa = document.getElementById('add-veh-placa')?.value;
    const color = document.getElementById('add-veh-color')?.value;

    if (!marca || !modelo || !placa) {
        alert("Por favor completa los campos obligatorios del vehículo.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/chofer/agregar-vehiculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_chofer: idUsuarioLogueado, 
                marca, modelo, placa, color 
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
        alert("Error de conexión al agregar el vehículo.");
    }
}

async function eliminarVehiculo(idVehiculo) {
    if (!confirm("¿Estás seguro de que deseas eliminar este vehículo?")) return;

    try {
        const response = await fetch(`${API_URL}/chofer/eliminar-vehiculo/${idVehiculo}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
            alert("Vehículo eliminado con éxito.");
            cargarDatosChofer(); 
        } else {
            alert("No se pudo eliminar: " + data.message);
        }
    } catch (error) {
        console.error("Error al eliminar vehículo:", error);
    }
}

async function consultarDeudaChofer() {
    const inputChofer = document.getElementById('adm-pago-id-chofer');
    const contenedor = document.getElementById('contenedor-liquidacion');
    const tablaCuerpo = document.getElementById('cuerpo-traslados-pendientes-chofer');

    if (!inputChofer) {
        alert("No se encontró el campo de ID de chofer. Revisa el HTML.");
        console.error("No se encontró el elemento con ID 'adm-pago-id-chofer'");
        return;
    }
    if (!contenedor || !tablaCuerpo) {
        alert("Falta un contenedor de resultados en la página. Revisa el HTML.");
        console.error("Faltan los elementos 'contenedor-liquidacion' o 'cuerpo-traslados-pendientes-chofer'");
        return;
    }

    const idChofer = inputChofer.value.trim();
    if (!idChofer) {
        alert("Por favor ingresa un ID de chofer.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/deuda-chofer/${idChofer}`);
        const data = await response.json();

        if (data.success) {
            contenedor.style.display = 'block';
            document.getElementById('resultado-deuda').innerHTML =
                `Deuda Total: $${data.deudaTotal} | Total Carreras: ${data.totalCarreras}`;

            tablaCuerpo.innerHTML = '';
            data.traslados.forEach(item => {
                tablaCuerpo.innerHTML += `<tr><td>${item.id_viaje}</td><td>${item.fecha.split('T')[0]}</td><td>${item.origen} -> ${item.destino}</td><td>$${item.ganancia_chofer}</td></tr>`;
            });

            const pagoMonto = document.getElementById('pago-monto');
            if (pagoMonto) pagoMonto.value = data.deudaTotal;
        } else {
            alert("Error: " + (data.message || "No se pudo obtener la deuda."));
        }
    } catch (err) {
        console.error("Error en consultarDeudaChofer:", err);
        alert("Error de conexión al servidor.");
    }
}

async function cargarVehiculosPendientes() {
    try {
        const res = await fetch(`${API_URL}/api/admin/vehiculos-pendientes`);
        const data = await res.json();
        const tbody = document.getElementById('tabla-vehiculos-pendientes-body');
        
        if (!tbody) return;

        if (data.success) {
            tbody.innerHTML = data.vehiculos.length ? "" : `<tr><td colspan="5" style="text-align:center;">No hay vehículos pendientes.</td></tr>`;
            data.vehiculos.forEach(v => {
                tbody.innerHTML += `<tr>
                    <td>${v.id_vehiculo}</td>
                    <td>${v.id_chofer}</td>
                    <td>${v.marca} ${v.modelo}</td>
                    <td>${v.placa}</td>
                    <td><button onclick="aprobarVehiculo(${v.id_vehiculo})">Calificar/Aprobar</button></td>
                </tr>`;
            });
        }
    } catch (err) {
        console.error("Error al cargar vehículos pendientes:", err);
    }
}

async function aprobarVehiculo(idVehiculo) {
    // 1. Pide la nota por pantalla
    const calificacionInput = prompt("Ingrese la calificación del vehículo (Mínimo 65 para Apto, menor para No Apto):");
    if (calificacionInput === null) return; 

    const calificacion = parseInt(calificacionInput);
    if (isNaN(calificacion) || calificacion < 0 || calificacion > 100) {
        alert("Por favor ingrese un número válido entre 0 y 100.");
        return;
    }

    try {
        // 2. Manda los datos al servidor
        const res = await fetch(`${API_URL}/api/admin/aprobar-vehiculo/${idVehiculo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nota_revision: calificacion })
        });

        const data = await res.json();
        
        // 3. AQUÍ ES EXACTAMENTE DONDE VA EL BLOQUE QUE PREGUNTABAS:
        if (res.ok && data.success) {
            // Si la nota no alcanzó el mínimo (menor a 65)
            if (data.message.includes('NO APTO') || data.message.includes('REPROBADO')) {
                alert(`❌ ${data.message}`); 
            } else {
                alert(`✅ ${data.message}`); 
            }
            
            // Actualiza la lista en pantalla para que el vehículo se procese
            if (typeof cargarVehiculosPendientes === 'function') {
                cargarVehiculosPendientes();
            }
        } else {
            alert("Error: " + (data.message || "No se pudo procesar"));
        }

    } catch (err) {
        console.error("Error al calificar el vehículo:", err);
        alert("Error de conexión con el servidor.");
    }
}

async function registrarEvaluacionAdmin() {
    const inputChofer = document.getElementById('adm-id-chofer');
    const inputNotaPsi = document.getElementById('adm-nota-psico');
    const inputNotaVeh = document.getElementById('adm-nota-veh');
    const inputBanco = document.getElementById('adm-id-banco');
    const inputCuenta = document.getElementById('adm-nro-cuenta');

    if (!inputChofer) {
        alert("Error de interfaz: No se encontró el campo 'adm-id-chofer'.");
        return;
    }

    const id_chofer = inputChofer.value;
    const nota_psicologica = inputNotaPsi ? inputNotaPsi.value : '';
    const nota_vehiculo = inputNotaVeh ? inputNotaVeh.value : '';
    const id_banco = inputBanco ? inputBanco.value : '';
    const nro_cuenta = inputCuenta ? inputCuenta.value : '';

    if (!id_chofer) {
        alert("Por favor ingresa el ID del chofer a evaluar.");
        return;
    }

    // Validación flexible: Solo aseguramos que si escriben notas, estén en el rango lógico de 0 a 100
    const psicoNum = parseInt(nota_psicologica);
    const vehNum = parseInt(nota_vehiculo);

    if ((nota_psicologica !== "" && (psicoNum < 0 || psicoNum > 100)) || 
        (nota_vehiculo !== "" && (vehNum < 0 || vehNum > 100))) {
        alert("Las calificaciones deben estar comprendidas entre 0 y 100.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/evaluar-chofer`, {
            method: 'POST', // Asegúrate de que coincida con el servidor
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_chofer, nota_psicologica, nota_vehiculo, id_banco, nro_cuenta })
        });
        const data = await res.json();
        
        if (data.success) {
            alert(data.message); // Muestra el mensaje dinámico (Aprobado o Reprobado según corresponda)
            if (typeof cargarVehiculosPendientes === 'function') {
                cargarVehiculosPendientes();
            }
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Error al registrar evaluación:", err);
        alert("Error de conexión con el servidor.");
    }
}

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
        const res = await fetch(`${API_URL}/api/chofer/actualizar-expediente/${idUsuarioLogueado}`, {
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
        const res = await fetch(`${API_URL}/api/chofer/cambiar-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cuenta: idUsuarioLogueado, contrasenaActual, contrasenaNueva })
        });
        const data = await res.json();
        alert(data.message);
    } catch (err) {}
}

async function evaluarVehiculoIndividual(idVehiculo) {
    let inputNota = prompt("Ingresa la calificación de revisión para este vehículo (Mínimo 65, Máximo 100):");
    if (inputNota === null) return;
    
    let nota = parseInt(inputNota); 

    if (isNaN(nota) || nota < 65 || nota > 100) {
        alert("La nota del vehículo debe estar entre 0 y 100.");
        return;
    }

    let fechaObtencion = new Date().toISOString().split('T')[0];

    try {
        const res = await fetch(`${API_URL}/api/admin/evaluar-vehiculo-adicional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idVehiculo, nota, fechaObtencion })
        });
        const data = await res.json();

        if (data.success) {
            alert("✅ Vehículo evaluado correctamente.");
            if (typeof cargarVehiculosPendientes === 'function') {
                cargarVehiculosPendientes();
            }
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Error de conexión:", err);
        alert("Error al conectar con el servidor.");
    }
}

async function consultarGananciasEmpresa() {
    const desde = document.getElementById('ganancia-desde').value;
    const hasta = document.getElementById('ganancia-hasta').value;

    if (!desde || !hasta) {
        alert("Por favor selecciona ambas fechas.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/ganancias?fechaDesde=${desde}&fechaHasta=${hasta}`);
        const data = await res.json();

        if (data.success) {
            const contenedor = document.getElementById('resultado-ganancias');
            contenedor.innerHTML = `✅ Total Recaudado (30%): <span style="color: #27ae60; font-size: 20px;">$${parseFloat(data.ganancias).toFixed(2)}</span> ` +
                                   `<br><small>Basado en ${data.totalViajes} traslados completados en el período.</small>`;
        } else {
            alert("Error al obtener ganancias: " + data.message);
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Error de conexión con el servidor.");
    }
}

async function consultarHistorialPagosChofer() {
    const inputIdChofer = document.getElementById('hist-id-chofer');
    const inputDesde = document.getElementById('hist-pago-desde');
    const inputHasta = document.getElementById('hist-pago-hasta');
    const cuerpoTabla = document.getElementById('cuerpo-historial-pagos');

    if (!inputIdChofer || !inputDesde || !inputHasta || !cuerpoTabla) {
        alert("Faltan campos del formulario de historial. Revisa el HTML.");
        console.error("No se encontraron uno o varios elementos de historial de pagos.");
        return;
    }

    const idChofer = inputIdChofer.value.trim();
    const desde = inputDesde.value;
    const hasta = inputHasta.value;

    if (!idChofer || !desde || !hasta) {
        alert("Por favor, rellena todos los campos para buscar el historial.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/pagos-chofer/${idChofer}?inicio=${desde}&fin=${hasta}`);
        const data = await response.json();

        if (data.success) {
            cuerpoTabla.innerHTML = '';
            data.pagos.forEach(p => {
                cuerpoTabla.innerHTML += `<tr><td>${p.id_pago}</td><td>${new Date(p.fecha_pago).toLocaleDateString()}</td><td>${p.nro_referencia}</td><td>$${p.monto_pagado}</td></tr>`;
            });
        } else {
            alert("Error al cargar historial: " + data.message);
        }
    } catch (err) {
        console.error("Error en consultarHistorialPagosChofer:", err);
        alert("Error de conexión con el servidor.");
    }
}


// Reemplaza/asegura estas funciones del modal (unificar uso de idViajeActual)
// Abrir modal de cancelación asegurando el ID del viaje activo
function abrirModalCancelar(idViaje) {
    const cardViajeActivo = document.getElementById('card-viaje-activo');

    if (!idViaje) {
        if (cardViajeActivo && cardViajeActivo.dataset.viajeId) {
            idViaje = cardViajeActivo.dataset.viajeId;
        } else if (idViajeActual) {
            idViaje = idViajeActual;
        }
    }

    if (idViaje !== undefined && idViaje !== null && idViaje !== '') {
        idViajeActual = idViaje;
        if (cardViajeActivo) cardViajeActivo.dataset.viajeId = idViaje;
    }

    const modal = document.getElementById('modal-cancelacion');
    if (!modal) {
        alert('No se encontró el modal de cancelación.');
        return;
    }

    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.pointerEvents = 'auto';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.zIndex = '1000000';
    modal.classList.remove('oculto');

    console.log('abrirModalCancelar: modal mostrado', {
        idViajeActual,
        idViaje,
        display: modal.style.display,
        visibility: modal.style.visibility,
        zIndex: modal.style.zIndex,
        pointerEvents: modal.style.pointerEvents
    });
}

function cerrarModal() {
    const m = document.getElementById('modal-cancelacion');
    if (m) {
        m.style.display = 'none';
        m.style.pointerEvents = 'none';
        m.classList.add('oculto');
    }
    const motivoEl = document.getElementById('motivo-cancelacion');
    if (motivoEl) motivoEl.value = '';
}

async function confirmarCancelacion() {
    let idViaje = idViajeActual;
    const motivoEl = document.getElementById('motivo-cancelacion');
    const motivo = motivoEl ? motivoEl.value.trim() : '';
    const quienCancela = window.canceladoPor || 'Cliente';
    console.log('confirmarCancelacion ejecutado', { idViaje, motivo });

    if (!idViaje) {
        const cardViajeActivo = document.getElementById('card-viaje-activo');
        if (cardViajeActivo && cardViajeActivo.dataset.viajeId) {
            idViaje = cardViajeActivo.dataset.viajeId;
            console.log('ID obtenido desde data-viaje-id:', idViaje);
        }
    }

    if (!idViaje) {
        alert("No se encontró el ID del viaje a cancelar.");
        cerrarModal();
        return;
    }

    if (!motivo) {
        alert("Por favor ingresa un motivo de cancelación.");
        return;
    }

    const btnConfirm = document.getElementById('btn-confirm-cancel');
    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.dataset.originalText = btnConfirm.innerText;
        btnConfirm.innerText = 'Cancelando...';
    }

    console.log('confirmarCancelacion start', { idViaje, motivo, quienCancela });

    try {
        const res = await fetchWithTimeout(`${API_URL}/api/traslados/${idViaje}/cancelar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo, canceladoPor: quienCancela })
        }, 8000);

        console.log('cancel fetch completed', { status: res.status, ok: res.ok });
        const data = await res.json();
        console.log('cancel response body', data);

        if (res.ok && data.success) {
            alert("Viaje cancelado exitosamente.");
            cerrarModal();
            const cardViajeActivo = document.getElementById('card-viaje-activo');
            if (cardViajeActivo) cardViajeActivo.classList.add('oculto');
            idViajeActual = null;
        } else {
            alert("No se pudo cancelar el viaje: " + (data.message || 'Error desconocido'));
        }
    } catch (err) {
        console.error("Error al cancelar:", err);
        if (err && err.name === 'AbortError') {
            alert('La petición tardó demasiado y fue abortada. Intenta de nuevo.');
        } else {
            alert('Error de conexión con el servidor.');
        }
    } finally {
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerText = btnConfirm.dataset.originalText || 'Confirmar';
        }
    }
}



// ...existing code...

async function cargarViajesChofer() {
    if (!idUsuarioLogueado) return;

    try {
        const res = await fetch(`${API_URL}/api/chofer/traslados/${idUsuarioLogueado}`);
        const data = await res.json();
        console.log("cargarViajesChofer data:", data);

        if (!data.success) return;

        const tbodyActivos = document.getElementById('tabla-viajes-activos-chofer');
        const tbodyPendientes = document.getElementById('tabla-viajes-pendientes-chofer');

        const normalizeViaje = (viaje, index) => ({
            id: viaje.id_traslado
                ?? viaje.id_viaje
                ?? viaje.idViaje
                ?? viaje.viaje_id
                ?? viaje.id
                ?? viaje._id
                ?? `P-${index + 1}`,
            fecha: viaje.fecha_traslado
                ? new Date(viaje.fecha_traslado).toLocaleDateString()
                : 'N/D',
            origen: viaje.origen ?? viaje.punto_A ?? viaje.puntoA ?? 'N/D',
            destino: viaje.destino ?? viaje.punto_B ?? viaje.puntoB ?? 'N/D'
        });

        if (tbodyActivos) {
            const activos = Array.isArray(data.activos) ? data.activos : [];
            tbodyActivos.innerHTML = activos.length === 0
                ? `<tr><td colspan="5" style="text-align:center; color:#a69295;">No hay viajes activos.</td></tr>`
                : activos.map((viaje, i) => {
                    const item = normalizeViaje(viaje, i);
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.fecha}</td>
                            <td>${item.origen}</td>
                            <td>${item.destino}</td>
                            <td>
                                <button class="btn-danger" onclick="reportarAveriaChofer('${item.id}')">Reportar Avería / Cancelar</button>
                            </td>
                        </tr>`;
                }).join('');
        }

        if (tbodyPendientes) {
            const pendientes = Array.isArray(data.pendientes) ? data.pendientes : [];
            tbodyPendientes.innerHTML = pendientes.length === 0
                ? `<tr><td colspan="5" style="text-align:center; color:#a69295;">No hay solicitudes pendientes.</td></tr>`
                : pendientes.map((viaje, i) => {
                    const item = normalizeViaje(viaje, i);
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.fecha}</td>
                            <td>${item.origen}</td>
                            <td>${item.destino}</td>
                            <td>
                                <button class="btn-primary" onclick="aceptarViajeChofer('${item.id}')">Aceptar</button>
                                <button class="btn-danger" onclick="rechazarViajeChofer('${item.id}')">Rechazar</button>
                            </td>
                        </tr>`;
                }).join('');
        }
    } catch (err) {
        console.error("Error cargando viajes del chofer:", err);
    }
}

async function reportarAveriaChofer(idViaje) {
    const motivo = prompt("Indica el motivo de la avería o cancelación:");
    if (!motivo) return;

    try {
        const res = await fetch(`${API_URL}/api/traslados/${idViaje}/cancelar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                motivo,
                canceladoPor: 'Chofer'
            })
        });
        const data = await res.json();
        if (data.success) {
            alert("Viaje cancelado y unidad liberada.");
            cargarViajesChofer();
        } else {
            alert("No se pudo cancelar: " + (data.message || "Error desconocido"));
        }
    } catch (err) {
        console.error("Error al reportar avería:", err);
        alert("Error de conexión con el servidor.");
    }
}

async function aceptarViajeChofer(idViaje) {
    try {
        const res = await fetch(`${API_URL}/api/traslados/${idViaje}/aceptar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            alert("Solicitud aceptada.");
            // Actualizar saldo visible si el backend devolvió el nuevo saldo
            if (data.nuevoSaldoChofer !== undefined && document.getElementById('chof-saldo-favor')) {
                const nuevo = typeof data.nuevoSaldoChofer === 'number' ? data.nuevoSaldoChofer : parseFloat(data.nuevoSaldoChofer || 0);
                document.getElementById('chof-saldo-favor').innerText = `$${(isNaN(nuevo) ? 0 : nuevo).toFixed(2)}`;
            } else {
                // Si no se devolvió, re-cargar datos del chofer para sincronizar
                if (typeof cargarDatosChofer === 'function') cargarDatosChofer();
            }
            cargarViajesChofer();
        } else {
            alert("Error al aceptar viaje: " + (data.message || "No se pudo aceptar."));
        }
    } catch (err) {
        console.error("Error al aceptar viaje:", err);
        alert("Error de conexión.");
    }
}

async function rechazarViajeChofer(idViaje) {
    const motivo = prompt("Motivo por el que rechazas el viaje:");
    if (!motivo) return;

    try {
        const res = await fetch(`${API_URL}/api/traslados/${idViaje}/cancelar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo, canceladoPor: 'Chofer' })
        });
        const data = await res.json();
        if (data.success) {
            alert("Viaje rechazado.");
            cargarViajesChofer();
        } else {
            alert("Error al rechazar viaje: " + (data.message || "No se pudo rechazar."));
        }
    } catch (err) {
        console.error("Error al rechazar viaje:", err);
        alert("Error de conexión.");
    }
}

// Agrega esto en tu app.js (Panel Administrativo)
async function verHistorialChofer(idChofer) {
    try {
        const res = await fetch(`${API_URL}/api/admin/historial-cancelaciones-chofer/${idChofer}`);
        const historial = await res.json();

        const tablaHistorial = document.getElementById('tabla-historial-admin'); // Asegúrate de tener este ID en tu HTML
        tablaHistorial.innerHTML = ''; // Limpiar tabla antes de llenar

        historial.forEach(viaje => {
            tablaHistorial.innerHTML += `
                <tr>
                    <td>${viaje.id_traslado}</td>
                    <td>${new Date(viaje.fecha_traslado).toLocaleDateString()}</td>
                    <td>${viaje.punto_A} a ${viaje.punto_B}</td>
                    <td>${viaje.motivo_cancelacion}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al cargar historial:", err);
    }
}

async function cargarHistorialAdmin() {
    // 1. Obtenemos el ID del chofer que escribió el admin
    const idChofer = document.getElementById('hist-id-chofer').value;
    console.log("El botón fue presionado"); // <--- Esto debería salir en la consola al hacer clic
    console.log("Buscando ID:", idChofer);

    if (!idChofer) {
        alert("Por favor, ingresa un ID de chofer.");
        return;
    }

    try {
        // 2. Llamamos a la API (asegúrate de que esta ruta coincida con la de tu server.js)
const res = await fetch(`${API_URL}/api/admin/historial-cancelaciones-chofer/${idChofer}`);        
        if (!res.ok) throw new Error("Error al obtener los datos");
        
        const historial = await res.json();

        // 3. Obtenemos el cuerpo de la tabla donde queremos mostrar los resultados
        const tbody = document.querySelector('#tabla-historial-admin tbody');
        tbody.innerHTML = ''; // Limpiamos resultados anteriores

        if (historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No hay viajes cancelados para este chofer.</td></tr>';
            return;
        }

        // 4. Llenamos la tabla con los datos recibidos
        // Dentro de la función del lado del admin que recorre el historial:
historial.forEach(viaje => {
    const fechaLegible = new Date(viaje.fecha_traslado).toLocaleDateString();
    
    // Identificamos de forma limpia quién canceló basándonos en el estado
    let quienCancelo = "Sistema/Desconocido";
    let colorBadge = "#7f8c8d";
    
    if (viaje.estado_pago_chofer === 'CanceladoPorCliente') {
        quienCancelo = "Cliente";
        colorBadge = "#2980b9"; // Azul
    } else if (viaje.estado_pago_chofer === 'CanceladoPorChofer') {
        quienCancelo = "Chofer (Avería/Otro)";
        colorBadge = "#d35400"; // Naranja/Rojo
    }

    tbody.innerHTML += `
        <tr>
            <td>${viaje.id_traslado}</td>
            <td>${fechaLegible}</td>
            <td>${viaje.punto_A} -> ${viaje.punto_B}</td>
            <td><span style="font-weight:bold; color:${colorBadge};">${quienCancelo}</span></td>
            <td>${viaje.motivo_cancelacion || 'Sin motivo registrado'}</td>
        </tr>
    `;
});
    } catch (err) {
        console.error("Error al cargar el historial:", err);
        alert("No se pudo cargar el historial: " + err.message);
    }
}

async function registrarPagoChofer() {
    const idChofer = document.getElementById('adm-pago-id-chofer').value;
    const referencia = document.getElementById('pago-referencia').value;
    const monto = document.getElementById('pago-monto').value;

    const response = await fetch('http://localhost:3000/api/admin/registrar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idChofer, referencia, monto })
    });

    const result = await response.json();
    if (result.success) {
        alert("¡Pago registrado con éxito!");
        consultarDeudaChofer(); // Refrescar la tabla
    } else {
        alert("Error al registrar pago: " + result.message);
    }
}

function inicializarPanelChofer(datosChofer) {
    // Mostrar el contenedor principal del chofer
    mostrarPantalla('panel-chofer');

    // Rellenar datos básicos si existen
    if (datosChofer) {
        const nombreSaludo = document.getElementById('chof-nombre-saludo');
        if (nombreSaludo) nombreSaludo.textContent = datosChofer.nombre || 'Chofer';
        
        const lblNombre = document.getElementById('lbl-chof-nombre');
        if (lblNombre) lblNombre.textContent = datosChofer.nombre || 'Conductor';

        const lblCedula = document.getElementById('lbl-chof-cedula');
        if (lblCedula) lblCedula.textContent = datosChofer.cedula || 'V-00000000';

        const lblCorreo = document.getElementById('lbl-chof-correo');
        if (lblCorreo) lblCorreo.textContent = datosChofer.correo || '---';
    }

    // Ejecutar de forma segura las funciones secundarias de carga si están definidas en tu app
    if (typeof cargarDatosChofer === 'function') {
        cargarDatosChofer().catch(err => console.error("Error cargando expediente del chofer:", err));
    }

    if (typeof cargarVehiculosChofer === 'function') {
        cargarVehiculosChofer().catch(err => console.error("Error cargando vehículos:", err));
    } else {
        // Fallback visual si la función de base de datos no está escrita aún
        const gridVehiculos = document.getElementById('chof-grid-vehiculos');
        if(gridVehiculos) {
            gridVehiculos.innerHTML = '<p style="color: green;">Módulo de vehículos listo para sincronizar.</p>';
        }
    }
}

// Función JS para que el admin consulte el historial
async function cargarHistorialCanceladosAdmin() {
    const idChofer = document.getElementById('hist-id-chofer-cancelados').value;
    if (!idChofer) {
        alert("Por favor, ingresa un ID de chofer válido.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/historial-cancelaciones-chofer/${idChofer}`);
        const historial = await res.json();

        const tbody = document.getElementById('cuerpo-historial-cancelados-admin');
        tbody.innerHTML = '';

        if (!historial || historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay registros de viajes cancelados para este chofer.</td></tr>';
            return;
        }

        // 🌟 AQUÍ ES EXACTAMENTE DONDE VA EL BLOQUE QUE ME MOSTRASTE:
        historial.forEach(viaje => {
            const fechaLegible = new Date(viaje.fecha_traslado).toLocaleDateString();
            
            let quienCancelo = "N/A";
            let colorBadge = "#7f8c8d";
            
            const estado = viaje.estado_pago_chofer || '';

            if (estado === 'CanceladoPorCliente' || viaje.cancelado_por === 'Cliente') {
                quienCancelo = "Cliente";
                colorBadge = "#2980b9"; // Azul
            } else if (estado === 'CanceladoPorChofer' || viaje.cancelado_por === 'Chofer') {
                quienCancelo = "Chofer";
                colorBadge = "#d35400"; // Naranja
            } else if (estado === 'Cancelado') {
                quienCancelo = "Sistema";
            }

            tbody.innerHTML += `
                <tr>
                    <td>${viaje.id_traslado}</td>
                    <td>${fechaLegible}</td>
                    <td>${viaje.punto_A} -> ${viaje.punto_B}</td>
                    <td><span style="font-weight:bold; color:${colorBadge};">${quienCancelo}</span></td>
                    <td>${viaje.motivo_cancelacion || 'Sin motivo registrado'}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar historial de cancelaciones:", err);
        alert("No se pudo conectar con el servidor.");
    }
}

// Función unificada para cancelar viaje en el panel de cliente (Estilo Chofer)
async function cancelarViajeCliente() {
    // Usamos la variable global correcta y estandarizada
    let idViaje = idViajeActual;
    const cardViajeActivo = document.getElementById('card-viaje-activo');

    // Respaldo por si el ID no está en la variable pero sí en el atributo de la tarjeta
    if (!idViaje && cardViajeActivo && cardViajeActivo.dataset.viajeId) {
        idViaje = cardViajeActivo.dataset.viajeId;
    }

    const motivoEl = document.getElementById('motivo-cancelacion');
    const motivo = motivoEl ? motivoEl.value.trim() : '';

    if (!idViaje) {
        alert("No se encontró el ID del viaje activo para cancelar.");
        cerrarModal();
        return;
    }

    if (!motivo) {
        alert("Por favor, ingresa un motivo de cancelación.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/api/traslados/${idViaje}/cancelar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.xml ? null : JSON.stringify({
                canceladoPor: 'Cliente',
                motivo: motivo
            })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok && resultado.success) {
            alert("Viaje cancelado exitosamente.");
            cerrarModal();
            
            // Ocultar la tarjeta de viaje activo y limpiar el ID actual
            if (cardViajeActivo) {
                cardViajeActivo.classList.add('oculto');
                cardViajeActivo.dataset.viajeId = '';
            }
            idViajeActual = null;
        } else {
            alert("Error al cancelar: " + (resultado.message || resultado.error || "Desconocido"));
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

function cambiarTabPerfilCliente(idTab) {
    console.log('cambiarTabPerfilCliente llamada con:', idTab);
    const contenidos = document.querySelectorAll('.tab-content-perfil');
    contenidos.forEach(seccion => {
        seccion.classList.add('oculto');
        seccion.style.setProperty('display', 'none', 'important');
        seccion.style.setProperty('visibility', 'hidden', 'important');
    });

    const botones = document.querySelectorAll('.tab-btn-perfil');
    botones.forEach(btn => btn.classList.remove('active'));

    const seccionActiva = document.getElementById(idTab);
    console.log('Sección encontrada:', seccionActiva);
    if (seccionActiva) {
        seccionActiva.classList.remove('oculto');
        seccionActiva.style.setProperty('display', 'block', 'important');
        seccionActiva.style.setProperty('visibility', 'visible', 'important');
    }

    let botonIdMap = {
        'cli-tab-inicio': 'btn-cli-tab-inicio',
        'cli-tab-pagos': 'btn-cli-tab-pagos',
        'cli-tab-historial': 'btn-cli-tab-historial',
        'cli-tab-ajustes': 'btn-cli-tab-ajustes'
    };

    const botonActivoId = botonIdMap[idTab];
    if (botonActivoId) {
        const btnObj = document.getElementById(botonActivoId);
        if (btnObj) btnObj.classList.add('active');
    }

    if (idTab === 'cli-tab-historial' && typeof cargarHistorialCliente === 'function') {
        cargarHistorialCliente();
    }
    if (idTab === 'cli-tab-ajustes' && typeof cargarDatosCliente === 'function') {
        cargarDatosCliente();
    }
}



function cerrarSesion() {
    window.location.reload();
}

// --- Pégalo exactamente aquí abajo ---
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirmar = document.getElementById('btn-confirmar-cancelacion');
    
    if (btnConfirmar) {
        btnConfirmar.replaceWith(btnConfirmar.cloneNode(true));
        
        document.getElementById('btn-confirmar-cancelacion').addEventListener('click', () => {
            cancelarViajeCliente();
        });
    }
});
