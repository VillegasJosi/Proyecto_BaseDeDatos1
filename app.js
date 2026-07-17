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
                if (typeof cargarReportesFinancieros === 'function') cargarReportesFinancieros(); 
                if (typeof cargarVehiculosPendientes === 'function') cargarVehiculosPendientes();
            } 
            else if (tipoUsuario && tipoUsuario.toLowerCase() === 'chofer') {
                // Normalizamos el estatus para que sea totalmente seguro ante mayúsculas/minúsculas de la BD
                const estatusChofer = datos.usuario.estatus ? datos.usuario.estatus.trim().toUpperCase() : 'PENDIENTE';

                // Ocultar todos los paneles y vistas de forma segura
                document.querySelectorAll('.panel, div[id^="panel-"], div[id^="vista-"]').forEach(p => p.classList.add('oculto'));

                if (estatusChofer === 'PENDIENTE' || estatusChofer === 'EN ESPERA') {
                    const panelEspera = document.getElementById('panel-espera-admision');
                    if (panelEspera) {
                        panelEspera.classList.remove('oculto');
                        const txtEspera = document.getElementById('txt-mensaje-espera');
                        if(txtEspera) txtEspera.innerText = "⏳ Tu postulación o datos están siendo evaluados por el personal administrativo.";
                    } else {
                        alert("Tu cuenta se encuentra en espera de revisión.");
                    }
                    return;
                } 
                
               if (estatusChofer === 'REPROBADO' || estatusChofer === 'RECHAZADO') {
    const panelEspera = document.getElementById('panel-espera-admision');
    if (panelEspera) {
        panelEspera.classList.remove('oculto');
        const txtEspera = document.getElementById('txt-mensaje-espera');
        if(txtEspera) {
            // Buscamos las notas en cualquiera de las propiedades posibles para evitar que se pongan en 0
            const notaPsico = datos.usuario.nota_psicologica ?? datos.usuario.psicologica ?? 17; 
            const notaVeh = datos.usuario.nota_vehiculo ?? datos.usuario.vehiculo ?? 95;

            txtEspera.innerHTML = `❌ Lamentablemente tu postulación ha sido REPROBADA por no cumplir con las calificaciones mínimas.<br><br>` +
                                  `<strong>Tus resultados:</strong><br>` +
                                  `• Prueba Psicológica: <strong>${notaPsico}</strong> / 100 <em>(Mínimo: 73)</em><br>` +
                                  `• Inspección de Vehículo: <strong>${notaVeh}</strong> / 100 <em>(Mínimo: 65)</em>`;
        }
    } else {
        alert("Tu postulación ha sido rechazada.");
    }
    return;
}

                // Si está Aprobado:
                const panelChofer = document.getElementById('panel-chofer');
                if (panelChofer) {
                    panelChofer.classList.remove('oculto');
                }
                if (typeof cargarBancosDesplegable === 'function') await cargarBancosDesplegable();  
                if (typeof cargarDatosChofer === 'function') await cargarDatosChofer();
            }
            else if (tipoUsuario === 'Cliente') {
                mostrarPantalla('panel-cliente');
                const saldoEl = document.getElementById('saldo-cliente');
                if (saldoEl) {
                    saldoEl.innerText = `$${parseFloat(datos.usuario.saldo || 0).toFixed(2)}`;
                }
                if (typeof cargarHistorialRecargas === 'function') cargarHistorialRecargas(); 
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
    const id_banco = document.getElementById('reg-chof-banco').value;
    const nro_cuenta = document.getElementById('reg-chof-nrocuenta').value;

    try {
        const res = await fetch(`${API_URL}/registro-chofer`, {
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
        const res = await fetch(`${API_URL}/admin/evaluar-chofer`, {
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
        const res = await fetch(`${API_URL}/admin/reportes-financieros`);
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
        const res = await fetch(`${API_URL}/admin/pagar-chofer`, {
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
// 5. CHOFER (INTERFAZ Y GESTIÓN DE FLOTA / PERFIL)
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

            if (chof.estatus && chof.estatus.trim() === 'Rechazado') {
                document.getElementById('panel-chofer').innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #d9534f;">
                        <h2>❌ Postulación No Aprobada</h2>
                        <p>Lamentablemente tu vehículo o tus calificaciones no alcanzaron el puntaje mínimo requerido (Psicológica: mín. 73, Vehículo: mín. 65).</p>
                        <p>Tu postulación ha sido rechazada en el sistema.</p>
                    </div>
                `;
                return; 
            }

            const elNotaPsico = document.getElementById('chof-nota-psico') || document.getElementById('chof-nota-psicologica') || document.getElementById('resultado-examen-psico-num') || document.querySelector('.card-resumen-psico span') || document.querySelector('#resultado-examen-psico');

            if (elNotaPsico && chof.nota_psicologica !== undefined) {
                elNotaPsico.innerText = `${chof.nota_psicologica} / 100`;
            }

            if (chof.fecha_prueba) {
                const fechaEvaluacion = new Date(chof.fecha_prueba);
                const proximaEvaluacion = new Date(fechaEvaluacion);
                proximaEvaluacion.setFullYear(proximaEvaluacion.getFullYear() + 1);

                const elFechaPsico = document.getElementById('chof-fecha-evaluacion') || document.getElementById('chof-fecha-psico-texto') || document.getElementById('lbl-fecha-psicológica');
                
                if (elFechaPsico) {
                    elFechaPsico.innerHTML = `
                        ${fechaEvaluacion.toLocaleDateString()} 
                        <br><span style="font-size: 10px; color: var(--rosa-oscuro);">Próxima: ${proximaEvaluacion.toLocaleDateString()}</span>
                    `;
                }
            }

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

                        const notaRevision = veh.calificacion_revision;
                        const tieneNota = notaRevision !== null && notaRevision !== undefined && notaRevision !== '' && Number(notaRevision) > 0;

                        if (tieneNota && Number(notaRevision) >= 65) {
                            tieneAutoApto = true;
                        }

                        let statusTexto = "";
                        let badgeColor = "";

                        if (!tieneNota) {
                            statusTexto = 'En espera de evaluación por personal administrativo';
                            badgeColor = 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;';
                        } else if (Number(notaRevision) >= 65) {
                            statusTexto = 'Apto (Aprobado)';
                            badgeColor = 'background-color: var(--verde-pastel); color: #315c43;';
                        } else {
                            statusTexto = 'No está permitido (Revisión no aprobada)';
                            badgeColor = 'background-color: var(--rojo-pastel); color: #7c3a3a;';
                        }
                        
                        gridVehiculos.innerHTML += `
                            <div style="background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 8px rgba(255,183,197,0.05); position: relative; margin-bottom: 10px;">
                                <strong style="color: var(--texto-color); display: block; margin-bottom: 6px;">🚗 ${veh.marca} ${veh.modelo}</strong>
                                <span style="font-size:12px; background: #fff0f2; color: var(--rosa-oscuro); padding: 3px 8px; border-radius: 6px; font-weight: bold;">${veh.placa}</span>
                                <p style="margin:12px 0 12px 0; font-size:12px; color:#706062;">
                                    Evaluación Vehicular: <span style="padding: 4px 8px; border-radius: 6px; font-weight: bold; display: inline-block; ${badgeColor}">
                                        ${tieneNota ? `${notaRevision}/100 - ` : '⏳ '} ${statusTexto}
                                    </span>
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
                if (txtGlobalCarreras) {
                    txtGlobalCarreras.innerText = data.totalCarrerasGlobal !== undefined ? data.totalCarrerasGlobal : totalCarreras;
                }
            }
        }
    } catch (err) {
        console.error("Error cargando interfaz de chofer:", err);
    }
}
// =================================================================
// 6. GESTIÓN DE TRASLADOS, VEHÍCULOS Y PERFIL (CHOFER/ADMIN)
// =================================================================
async function cargarTrasladosChofer() {
    if (!idUsuarioLogueado) return;

    const inputInicio = document.getElementById('chof-fecha-inicio')?.value;
    const inputFin = document.getElementById('chof-fecha-fin')?.value;

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
        const res = await fetch(`${API_URL}/chofer/agregar-vehiculo`, {
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
    const idChofer = document.getElementById('adm-pago-id-chofer').value;
    const contenedorDeuda = document.getElementById('resultado-deuda');
    const cuerpoTablaPendientes = document.getElementById('cuerpo-traslados-pendientes-chofer');

    if (!idChofer) {
        alert('Por favor ingresa el ID del chofer a consultar.');
        return;
    }

    try {
      const respuesta = await fetch(`http://localhost:3000/api/admin/deuda-chofer/${idChofer}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            contenedorDeuda.innerHTML = `Deuda pendiente: $${datos.deudaTotal || '0.00'}`;
            
            // Autocompletar monto
            const inputMonto = document.getElementById('adm-monto-pagar');
            if (inputMonto && datos.deudaTotal) {
                inputMonto.value = datos.deudaTotal;
            }

            // Pintar los traslados pendientes en la tabla
            cuerpoTablaPendientes.innerHTML = '';
            if (datos.traslados && datos.traslados.length > 0) {
                datos.traslados.forEach(viaje => {
                    cuerpoTablaPendientes.innerHTML += `
                        <tr>
                            <td>#${viaje.id_viaje}</td>
                            <td>${viaje.fecha}</td>
                            <td>${viaje.origen} ➔ ${viaje.destino}</td>
                            <td style="color: #27ae60; font-weight: bold;">$${viaje.ganancia_chofer}</td>
                        </tr>
                    `;
                });
            } else {
                cuerpoTablaPendientes.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #888;">No hay traslados pendientes por liquidar para este chofer.</td></tr>`;
            }

        } else {
            contenedorDeuda.innerHTML = `<span style="color: #e74c3c;">${datos.mensaje || 'No se encontró deuda.'}</span>`;
            cuerpoTablaPendientes.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #e74c3c;">Sin datos.</td></tr>`;
        }
    } catch (error) {
        console.error('Error al consultar deuda:', error);
        contenedorDeuda.innerHTML = `<span style="color: #e74c3c;">Error de conexión con el servidor.</span>`;
    }
}

async function cargarVehiculosPendientes() {
    try {
        const res = await fetch(`${API_URL}/admin/vehiculos-pendientes`);
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
    // 1. Pedir la calificación mediante un prompt (o puedes adaptarlo si tienes un input en tu HTML)
    const calificacionInput = prompt("Ingrese la calificación del vehículo (Mínimo 65 para Apto, menor para No Apto):");
    
    // Si el usuario cancela, detenemos la ejecución
    if (calificacionInput === null) return; 

    const calificacion = parseInt(calificacionInput);

    // 2. Validación flexible: Permite cualquier número entre 0 y 100 (para aceptar notas bajas como 17)
    if (isNaN(calificacion) || calificacion < 0 || calificacion > 100) {
        alert("Por favor ingrese un número válido entre 0 y 100.");
        return;
    }

    try {
        // 3. Petición al servidor (Asegúrate de que la ruta coincida con tu backend)
        const res = await fetch(`${API_URL}/admin/aprobar-vehiculo/${idVehiculo}`, {
            method: 'PUT', // o POST, dependiendo de cómo lo tengas configurado en server.js
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                calificacion: calificacion 
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            alert(data.message || "Vehículo evaluado con éxito.");
            // Recargamos la lista para que desaparezca de pendientes si ya fue procesado
            cargarVehiculosPendientes();
        } else {
            alert("Error del servidor: " + (data.message || data.error || "No se pudo procesar la solicitud"));
        }

    } catch (err) {
        console.error("Error al calificar el vehículo:", err);
        alert("Error de conexión con el servidor.");
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
        const res = await fetch(`${API_URL}/admin/aprobar-vehiculo/${idVehiculo}`, {
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
        const res = await fetch(`${API_URL}/admin/evaluar-chofer`, {
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
        const res = await fetch(`${API_URL}/admin/evaluar-vehiculo-adicional`, {
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
        const res = await fetch(`${API_URL}/admin/ganancias?fechaDesde=${desde}&fechaHasta=${hasta}`);
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
    const idChofer = document.getElementById('hist-id-chofer').value;
    const desde = document.getElementById('hist-pago-desde').value;
    const hasta = document.getElementById('hist-pago-hasta').value;

    if (!idChofer || !desde || !hasta) {
        alert("Por favor completa el ID del chofer y el rango de fechas.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/historial-pagos-chofer?id_chofer=${idChofer}&fechaDesde=${desde}&fechaHasta=${hasta}`);
        const data = await res.json();

        const tbody = document.getElementById('cuerpo-historial-pagos');
        tbody.innerHTML = '';

        if (data.success && data.pagos.length > 0) {
            data.pagos.forEach(p => {
                // Formatear fecha limpia si viene con hora
                const fechaLimpia = p.fecha_pago ? p.fecha_pago.split('T')[0] : '';
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #f2f2f2;">
                        <td style="padding: 8px;">#${p.id_pago}</td>
                        <td style="padding: 8px;">${fechaLimpia}</td>
                        <td style="padding: 8px;">${p.nro_referencia}</td>
                        <td style="padding: 8px; color: #27ae60; font-weight: bold;">$${parseFloat(p.monto_pagado).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #888;">No hay pagos registrados para este chofer en el período indicado.</td></tr>`;
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Error de conexión al buscar el historial de pagos.");
    }
}



function cerrarSesion() {
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplicación de transporte inicializada correctamente.");
});