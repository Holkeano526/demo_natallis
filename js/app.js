const SCRIPT_URL = "/api/google"; 
let authToken = sessionStorage.getItem('natallisAuth') || ""; 

let todosLosDatos = [];
let boletasExistentes = []; 
let buscadorEntregas; 
let timeoutBusqueda; 

let datosFiltradosGlobal = [];
let paginaActual = 1;
const filasPorPagina = 10;
let ordenActual = { columna: 'boleta', ascendente: false };

function llamadaApi(action, payload = {}) {
  return fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action: action, password: authToken, ...payload })
  })
  .then(async res => {
    const textResponse = await res.text();
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (err) {
      throw new Error("Respuesta no válida del servidor.");
    }
    
    if (!res.ok || data.status === "error") {
      throw new Error(data.data || "Error desconocido");
    }
    
    return data.data;
  });
}

document.addEventListener("DOMContentLoaded", function() {
  if (authToken !== "") {
    verificarSesionYArrancar();
  }
});

function intentarLogin(e) {
  e.preventDefault();
  const pwdInput = document.getElementById('inputPassword');
  const pwd = pwdInput.value;
  const btn = document.getElementById('btnAcceder');
  const errorMsg = document.getElementById('loginErrorMsg');
  
  if (errorMsg) errorMsg.style.display = 'none';

  btn.innerHTML = '<span class="material-symbols-rounded animate-spin">hourglass_empty</span> Verificando...';
  btn.disabled = true;

  authToken = pwd; 

  llamadaApi("obtenerRegistros", {})
    .then(datos => {
      sessionStorage.setItem('natallisAuth', authToken);
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      
      todosLosDatos = datos;
      boletasExistentes = datos.map(fila => String(fila[0]));
      arrancarApp();
    })
    .catch(err => {
      authToken = ""; 
      sessionStorage.removeItem('natallisAuth');
      
      if (errorMsg) errorMsg.style.display = 'block';
      
      btn.innerHTML = 'Acceder al Sistema';
      btn.disabled = false;
      pwdInput.value = ''; 
      pwdInput.focus();    
    });
}

function verificarSesionYArrancar() {
  llamadaApi("obtenerRegistros", {})
    .then(datos => {
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      todosLosDatos = datos;
      boletasExistentes = datos.map(fila => String(fila[0]));
      arrancarApp();
    })
    .catch(err => {
      authToken = "";
      sessionStorage.removeItem('natallisAuth');
      document.getElementById('loginOverlay').style.display = 'flex';
    });
}

function arrancarApp() {
  establecerSemanaActual(); 
  buscadorEntregas = new TomSelect("#boletaEntrega", { create: false, placeholder: "Buscar N° de boleta pendiente...", maxOptions: 200 });
  cargarDashboard();
  actualizarBuscadorTomSelect();
}

function cerrarSesion() {
  authToken = "";
  sessionStorage.removeItem('natallisAuth');
  window.location.reload(); 
}

function toggleTipoFiltro(usarFechas) {
  const switchElement = document.getElementById('switchTipoFiltro');
  const grupoFechas = document.getElementById('grupoFiltroFechas');
  const grupoBoletas = document.getElementById('grupoFiltroBoletas');
  const labelFechas = document.getElementById('labelFechas');
  const labelBoletas = document.getElementById('labelBoletas');

  if (switchElement.checked !== usarFechas) {
    switchElement.checked = usarFechas;
  }

  if (usarFechas) {
    grupoFechas.classList.add('active');
    grupoBoletas.classList.remove('active');
    labelFechas.classList.add('active');
    labelBoletas.classList.remove('active');
    
    document.getElementById('boletaDesde').value = "";
    document.getElementById('boletaHasta').value = "";
  } else {
    grupoBoletas.classList.add('active');
    grupoFechas.classList.remove('active');
    labelBoletas.classList.add('active');
    labelFechas.classList.remove('active');

    document.getElementById('fechaDesde').value = "";
    document.getElementById('fechaHasta').value = "";
  }

  cargarDashboard(); 
}

function limpiarFiltros() {
  document.getElementById('buscarBoleta').value = "";
  document.getElementById('boletaDesde').value = "";
  document.getElementById('boletaHasta').value = "";
  document.getElementById('fechaDesde').value = "";
  document.getElementById('fechaHasta').value = "";
  cargarDashboard();
}

function establecerSemanaActual() {
  let hoy = new Date(); let diaSemana = hoy.getDay(); let diasParaLunes = diaSemana === 0 ? 6 : diaSemana - 1; 
  let lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diasParaLunes);
  let domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  
  document.getElementById('fechaDesde').value = formatearFecha(lunes);
  document.getElementById('fechaHasta').value = formatearFecha(domingo);
  
  document.getElementById('switchTipoFiltro').checked = false;
  toggleTipoFiltro(false);
}

function formatearFecha(fecha) {
  let d = fecha.getDate().toString().padStart(2, '0'); let m = (fecha.getMonth() + 1).toString().padStart(2, '0'); let y = fecha.getFullYear();
  return `${y}-${m}-${d}`;
}

function cambiarTab(indice) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === indice));
  document.querySelectorAll('.tab-content').forEach((c, i) => c.classList.toggle('active', i === indice));
  
  if (indice === 1) { 
    document.getElementById('tablaCuerpo').innerHTML = "<tr><td colspan='10' style='text-align:center; padding: 30px;'><span class='material-symbols-rounded animate-spin'>hourglass_empty</span> Cargando datos...</td></tr>";
    setTimeout(() => { cargarDatosDesdeServidor(); }, 50);
  }
}

function enviarDatos(e) {
  e.preventDefault();
  var boleta = document.getElementById('boleta').value;
  var precio = parseFloat(document.getElementById('precio').value) || 0;
  var acuenta = parseFloat(document.getElementById('acuenta').value) || 0;
  var metodo = document.querySelector('input[name="metodoRegistro"]:checked').value;
  var categoria = document.getElementById('categoria').value;

  if (boletasExistentes.includes(String(boleta))) {
    Swal.fire({ icon: 'error', title: 'Boleta Duplicada', text: `La boleta N° ${boleta} ya ha sido registrada anteriormente.`, confirmButtonColor: '#2b3035' }); return; 
  }
  if (acuenta > precio) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'El monto A Cuenta no puede ser mayor al Precio Total.', confirmButtonColor: '#2b3035' }); return;
  }

  if (precio > 0 && acuenta === precio) {
    Swal.fire({
      title: 'Pago Total Detectado', text: `El cliente ha pagado S/ ${precio}. ¿La prenda ya fue ENTREGADA?`, icon: 'question',
      showCancelButton: true, confirmButtonColor: '#ffe22c', cancelButtonColor: '#2b3035',
      confirmButtonText: '<span style="color: black; font-weight: bold;">Sí, Entregada</span>', cancelButtonText: 'No, dejar Pendiente'
    }).then((result) => {
      ejecutarGuardadoBackend({ boleta: boleta, precio: precio, acuenta: acuenta, metodoPago: metodo, estado: result.isConfirmed ? "Entregado" : "Pendiente", categoria: categoria });
    });
  } else {
    ejecutarGuardadoBackend({ boleta: boleta, precio: precio, acuenta: acuenta, metodoPago: metodo, estado: "Pendiente", categoria: categoria });
  }
}

function ejecutarGuardadoBackend(datos) {
  document.getElementById('btnGuardar').disabled = true;
  document.getElementById('btnGuardar').innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Guardando...';

  llamadaApi("guardarBoleta", { datos: datos }).then(res => {
    if(res.startsWith("Error")) { Swal.fire({ icon: 'error', title: 'Oops...', text: res, confirmButtonColor: '#2b3035' }); } 
    else {
      Swal.fire({ icon: 'success', title: '¡Guardado!', text: res, timer: 2000, showConfirmButton: false });
      document.getElementById('formularioSastreria').reset(); document.getElementById('acuenta').value = 0; document.getElementById('boleta').focus();
      boletasExistentes.push(String(datos.boleta)); 
    }
  }).catch(err => {
      Swal.fire('Error', err.message, 'error');
  }).finally(() => {
      document.getElementById('btnGuardar').disabled = false;
      document.getElementById('btnGuardar').innerHTML = '<span class="material-symbols-rounded">save</span> Guardar Registro';
  });
}

function entregarPrenda() {
  var num = document.getElementById('boletaEntrega').value;
  if(!num) { Swal.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona una boleta primero.', confirmButtonColor: '#ffe22c' }); return; }
  
  Swal.fire({title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

  llamadaApi("actualizarEstado", { numeroBoleta: num }).then(res => {
    Swal.fire({ icon: 'success', title: 'Entregado', text: res, timer: 2000, showConfirmButton: false });
    buscadorEntregas.clear(); cargarDatosDesdeServidor(); 
  }).catch(err => Swal.fire('Error', err.message, 'error'));
}

function cargarDatosDesdeServidor() {
  llamadaApi("obtenerRegistros", {}).then(datos => {
    todosLosDatos = datos; boletasExistentes = datos.map(fila => String(fila[0])); 
    cargarDashboard(); actualizarBuscadorTomSelect(); 
  }).catch(err => Swal.fire('Error de conexión', 'No se pudieron cargar los datos de la base de datos.', 'error'));
}

function actualizarBuscadorTomSelect() {
  if (!buscadorEntregas) return;
  buscadorEntregas.clear(); buscadorEntregas.clearOptions();
  let opciones = [];
  todosLosDatos.forEach(fila => {
    if (fila[5] === "Pendiente") opciones.push({ value: fila[0], text: "Boleta N° " + fila[0] + " (Saldo: S/ " + fila[4].toFixed(2) + ")" });
  });
  buscadorEntregas.addOptions(opciones.slice(0, 300));
}

function buscarConRetraso() { clearTimeout(timeoutBusqueda); timeoutBusqueda = setTimeout(cargarDashboard, 300); }

function abrirModalEdicion(boleta, precio, acuenta, metodo, categoria) {
  document.getElementById('editBoletaOriginal').value = boleta; document.getElementById('editBoletaNueva').value = boleta;
  document.getElementById('editPrecio').value = precio; document.getElementById('editAcuenta').value = acuenta;
  
  let selectMetodo = document.getElementById('editMetodo');
  if (metodo === "Yape") selectMetodo.value = "Yape"; else if (metodo === "Efectivo") selectMetodo.value = "Efectivo"; else selectMetodo.value = "-";
  
  let selectCategoria = document.getElementById('editCategoria');
  if (categoria) selectCategoria.value = categoria;

  document.getElementById('modalEditar').classList.add('active');
}

function cerrarModal() { document.getElementById('modalEditar').classList.remove('active'); }

// 🌟 FUNCIÓN DE EDICIÓN MODIFICADA
function guardarEdicion(e) {
  e.preventDefault();
  var precio = parseFloat(document.getElementById('editPrecio').value) || 0;
  var acuenta = parseFloat(document.getElementById('editAcuenta').value) || 0;
  var categoria = document.getElementById('editCategoria').value;
  
  if (acuenta > precio) { Swal.fire({ icon: 'error', title: 'Error', text: 'El monto A Cuenta corregido no puede ser mayor al Precio Total.', confirmButtonColor: '#2b3035' }); return; }

  var datos = { 
    boletaOriginal: document.getElementById('editBoletaOriginal').value, 
    boletaNueva: document.getElementById('editBoletaNueva').value, 
    precio: precio, 
    acuenta: acuenta, 
    metodoPago: document.getElementById('editMetodo').value, 
    categoria: categoria,
    estado: "Mantener" 
  };

  if (precio > 0 && acuenta === precio) {
    Swal.fire({
      title: 'Pago Total Detectado',
      text: `El saldo es S/ 0.00. ¿Deseas marcar la boleta como ENTREGADA automáticamente?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffe22c',
      cancelButtonColor: '#2b3035',
      confirmButtonText: 'Sí, Entregada',
      cancelButtonText: 'No, dejar igual'
    }).then((result) => {
      datos.estado = result.isConfirmed ? "Entregado" : "Mantener";
      ejecutarLlamadaEdicion(datos, e.target);
    });
  } else {
    ejecutarLlamadaEdicion(datos, e.target);
  }
}

// 🌟 FUNCIÓN AUXILIAR DE EDICIÓN
function ejecutarLlamadaEdicion(datos, formTarget) {
  var btn = formTarget.querySelector('button[type="submit"]');
  btn.innerHTML = '<span class="material-symbols-rounded">hourglass_empty</span> Actualizando...'; 
  btn.disabled = true;

  llamadaApi("editarBoleta", { datos: datos }).then(res => {
    if(!res.startsWith("Error")) { 
      Swal.fire({ icon: 'success', title: 'Actualizado', text: res, timer: 2000, showConfirmButton: false }); 
      cerrarModal(); 
      cargarDatosDesdeServidor(); 
    } else { 
      Swal.fire({ icon: 'error', title: 'Oops...', text: res, confirmButtonColor: '#2b3035' }); 
    }
  }).catch(err => Swal.fire('Error', err.message, 'error'))
  .finally(() => { 
    btn.innerHTML = '<span class="material-symbols-rounded">sync</span> Guardar Cambios'; 
    btn.disabled = false; 
  });
}

function toggleTodos(source) {
  let checkboxes = document.querySelectorAll('.check-boleta:not([disabled])');
  checkboxes.forEach(cb => cb.checked = source.checked);
}

function marcarSeleccionados() {
  let seleccionados = [];
  document.querySelectorAll('.check-boleta:checked').forEach(cb => { seleccionados.push(cb.value); });
  if (seleccionados.length === 0) { Swal.fire({ icon: 'warning', title: 'Sin selección', text: 'Por favor, selecciona al menos una boleta.', confirmButtonColor: '#2b3035' }); return; }

  Swal.fire({
    title: '¿Confirmar Entrega?', text: `Vas a entregar ${seleccionados.length} boleta(s). Se asumirá el pago de los saldos pendientes.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#2b3035', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, entregar todas'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({title: 'Procesando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
      llamadaApi("actualizarBoletasBulk", { listaBoletas: seleccionados }).then(respuesta => {
          Swal.fire({ icon: 'success', title: 'Completado', text: respuesta, timer: 2500, showConfirmButton: false });
          cargarDatosDesdeServidor(); 
      }).catch(err => Swal.fire('Error', err.message, 'error'));
    }
  });
}

// 🌟 NUEVA FUNCIÓN PARA RELLENAR FALTANTES
function ejecutarRellenoFaltantes() {
  Swal.fire({
    title: '¿Rellenar boletas faltantes?',
    text: 'Se buscarán los huecos en la secuencia y se rellenarán automáticamente con S/ 0.00.',
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#2b3035', confirmButtonText: 'Sí, rellenar secuencia'
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({title: 'Buscando huecos...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
      llamadaApi("rellenar", {}).then(res => {
        Swal.fire({ icon: 'success', title: 'Completado', text: res, confirmButtonColor: '#ffe22c' });
        cargarDatosDesdeServidor(); 
      }).catch(err => Swal.fire('Error', err.message, 'error'));
    }
  });
}

function cambiarOrden(columna) {
  if (ordenActual.columna === columna) { ordenActual.ascendente = !ordenActual.ascendente; } 
  else { ordenActual.columna = columna; ordenActual.ascendente = true; }
  cargarDashboard();
}

function formatearFechaTabla(timestamp, textoOriginal) {
  if (!timestamp) return textoOriginal;
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return textoOriginal;
  
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  let horas = d.getHours();
  const ampm = horas >= 12 ? 'PM' : 'AM';
  horas = horas % 12;
  horas = horas ? horas : 12; 
  const min = String(d.getMinutes()).padStart(2, '0');
  
  return `${dia}/${mes}/${anio} <br><span style="color:#6c757d; font-size: 12px;">${horas}:${min} ${ampm}</span>`;
}

function cargarDashboard() {
  let textoBusqueda = document.getElementById('buscarBoleta').value.toLowerCase().trim();
  
  let strDesde = document.getElementById('fechaDesde').value; 
  let strHasta = document.getElementById('fechaHasta').value;
  let tsDesde = strDesde ? new Date(strDesde + "T00:00:00").getTime() : 0; 
  let tsHasta = strHasta ? new Date(strHasta + "T23:59:59").getTime() : Infinity;

  let bDesdeInput = document.getElementById('boletaDesde').value;
  let bHastaInput = document.getElementById('boletaHasta').value;
  let numBoletaDesde = bDesdeInput ? parseInt(bDesdeInput) : 0;
  let numBoletaHasta = bHastaInput ? parseInt(bHastaInput) : Infinity;

  let contTotal = 0, contEntregado = 0, contPendiente = 0;
  let dineroTotalVentas = 0, dineroIngresosCaja = 0, dineroPorCobrar = 0;    
  let ingresosPorCategoria = {}; let filtrados = [];

  todosLosDatos.forEach(fila => {
    let numeroBoletaTexto = String(fila[0]).toLowerCase(); 
    let numeroBoletaInt = parseInt(fila[0]) || 0;
    let categoriaFila = String(fila[8] || "Sin categoría").trim(); 
    let tsFila = fila[6]; 
    
    if (textoBusqueda !== "" && !numeroBoletaTexto.includes(textoBusqueda) && !categoriaFila.toLowerCase().includes(textoBusqueda)) return;
    
    if (tsDesde > 0 && tsFila < tsDesde) return;
    if (tsHasta !== Infinity && tsFila > tsHasta) return;

    if (numeroBoletaInt < numBoletaDesde) return;
    if (numeroBoletaInt > numBoletaHasta) return;

    contTotal++; dineroTotalVentas += fila[2]; dineroIngresosCaja += fila[3]; dineroPorCobrar += fila[4];    
    if (fila[5] === "Entregado") contEntregado++; else contPendiente++;
    
    ingresosPorCategoria[categoriaFila] = (ingresosPorCategoria[categoriaFila] || 0) + fila[2];
    filtrados.push(fila);
  });

  filtrados.sort((a, b) => {
    let valA, valB;
    switch(ordenActual.columna) {
      case 'boleta': valA = Number(a[0]); valB = Number(b[0]); break;
      case 'fecha':  valA = Number(a[6]); valB = Number(b[6]); break;
      case 'total':  valA = Number(a[2]); valB = Number(b[2]); break;
      case 'metodo': valA = a[7]; valB = b[7]; break;
      case 'estado': valA = a[5]; valB = b[5]; break;
      case 'categoria': valA = a[8]; valB = b[8]; break;
    }
    if (typeof valA === 'string') return ordenActual.ascendente ? valA.localeCompare(valB) : valB.localeCompare(valA);
    else return ordenActual.ascendente ? valA - valB : valB - valA;
  });

  document.querySelectorAll('.sort-icon').forEach(icon => { icon.innerText = 'swap_vert'; icon.classList.remove('active'); });
  let iconActivo = document.getElementById('icon-' + ordenActual.columna);
  if (iconActivo) { iconActivo.innerText = ordenActual.ascendente ? 'arrow_upward' : 'arrow_downward'; iconActivo.classList.add('active'); }

  document.getElementById('countTotal').innerText = contTotal; document.getElementById('countEntregado').innerText = contEntregado; document.getElementById('countPendiente').innerText = contPendiente;
  document.getElementById('sumTotalVentas').innerText = "S/ " + dineroTotalVentas.toFixed(2); document.getElementById('sumIngresosReales').innerText = "S/ " + dineroIngresosCaja.toFixed(2); document.getElementById('sumPorCobrar').innerText = "S/ " + dineroPorCobrar.toFixed(2);

  let htmlCategorias = "";
  const iconosCat = { "Arreglo": "content_cut", "Bordado": "dry_cleaning", "Teñido": "palette", "Venta de ropa": "styler", "Sin categoría": "category" };

  for (let cat in ingresosPorCategoria) {
      if (ingresosPorCategoria[cat] > 0) {
          let icon = iconosCat[cat] || "category";
          htmlCategorias += `
              <div class="cat-summary-card">
                  <div class="cat-name"><span class="material-symbols-rounded" style="color: #6c757d; font-size:20px;">${icon}</span> ${cat}</div>
                  <div class="cat-amount">S/ ${ingresosPorCategoria[cat].toFixed(2)}</div>
              </div>`;
      }
  }
  if(htmlCategorias === "") htmlCategorias = "<p style='color:#6c757d; width:100%; text-align:center;'>No hay ingresos registrados en este rango.</p>";
  document.getElementById('resumenCategorias').innerHTML = htmlCategorias;

  datosFiltradosGlobal = filtrados; paginaActual = 1; renderizarTablaPaginada();
}
      
function getCategoriaBadge(cat) {
  let clase = "cat-default"; let icon = "category";
  if(cat === "Arreglo") { clase = "cat-arreglo"; icon = "content_cut"; }
  else if(cat === "Bordado") { clase = "cat-bordado"; icon = "dry_cleaning"; }
  else if(cat === "Teñido") { clase = "cat-teñido"; icon = "palette"; }
  else if(cat === "Venta de ropa") { clase = "cat-ventaderopa"; icon = "styler"; }
  return `<span class="cat-badge ${clase}"><span class="material-symbols-rounded" style="font-size: 14px;">${icon}</span> ${cat}</span>`;
}

function renderizarTablaPaginada() {
  let inicio = (paginaActual - 1) * filasPorPagina; let fin = inicio + filasPorPagina; let paginaDatos = datosFiltradosGlobal.slice(inicio, fin);
  let htmlTabla = "";

  if (paginaDatos.length === 0) htmlTabla = `<tr><td colspan="10" style="text-align:center; padding: 30px; color: #666;"><span class="material-symbols-rounded" style="font-size: 2em; display:block; margin-bottom:10px;">search_off</span>No se encontraron boletas con estos filtros.</td></tr>`;

  paginaDatos.forEach(fila => {
    let colorEstado = fila[5] === 'Entregado' ? 'estado-entregado' : 'estado-pendiente';
    let badgeMetodo = fila[7] === 'Yape' ? '<span class="badge-yape">YAPE</span>' : fila[7];
    let disableCheck = fila[5] === 'Entregado' ? 'disabled' : '';
    let badgeCategoria = getCategoriaBadge(fila[8]);
    let fechaLimpia = formatearFechaTabla(fila[6], fila[1]);

    htmlTabla += `
      <tr>
        <td><input type="checkbox" class="check-boleta" value="${fila[0]}" ${disableCheck}></td>
        <td><strong>${fila[0]}</strong></td>
        <td>${fechaLimpia}</td>
        <td>${badgeCategoria}</td>
        <td>S/ ${fila[2].toFixed(2)}</td>
        <td>S/ ${fila[3].toFixed(2)}</td>
        <td style="color:${fila[4] > 0 ? '#dc3545' : '#1f2328'}; font-weight:700;">S/ ${fila[4].toFixed(2)}</td>
        <td>${badgeMetodo}</td>
        <td><span class="estado-badge ${colorEstado}">${fila[5]}</span></td>
        <td>
          <button class="btn-editar" onclick="abrirModalEdicion('${fila[0]}', ${fila[2]}, ${fila[3]}, '${fila[7]}', '${fila[8]}')">
            <span class="material-symbols-rounded" style="font-size:16px;">edit</span>
          </button>
        </td>
      </tr>`;
  });
  document.getElementById('tablaCuerpo').innerHTML = htmlTabla;
  document.getElementById('checkTodos').checked = false; renderizarControlesPaginacion();
}

function cambiarPagina(delta) { paginaActual += delta; renderizarTablaPaginada(); }

function renderizarControlesPaginacion() {
  let totalPaginas = Math.ceil(datosFiltradosGlobal.length / filasPorPagina);
  let contenedor = document.getElementById('paginacionContainer');
  if (totalPaginas <= 1) { contenedor.innerHTML = ""; return; }

  let html = `<button class="btn-pag" onclick="cambiarPagina(-1)" ${paginaActual === 1 ? 'disabled' : ''}><span class="material-symbols-rounded">chevron_left</span></button>`;
  let inicioPag = Math.max(1, paginaActual - 2); let finPag = Math.min(totalPaginas, inicioPag + 4);
  if (finPag - inicioPag < 4) { inicioPag = Math.max(1, finPag - 4); }

  for (let i = inicioPag; i <= finPag; i++) {
    let act = i === paginaActual ? 'active' : '';
    html += `<button class="btn-pag ${act}" onclick="paginaActual=${i}; renderizarTablaPaginada()">${i}</button>`;
  }
  html += `<button class="btn-pag" onclick="cambiarPagina(1)" ${paginaActual === totalPaginas ? 'disabled' : ''}><span class="material-symbols-rounded">chevron_right</span></button>`;
  contenedor.innerHTML = html;
}

function generarPDF() {
  if (datosFiltradosGlobal.length === 0) {
    Swal.fire({ icon: 'info', title: 'Tabla vacía', text: 'No hay registros en este rango para exportar.', confirmButtonColor: '#2b3035' });
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(31, 35, 40); 
  doc.text("Reporte de Ingresos - Sastrería Natallis", 14, 20);

  let textoRango = "";
  const usaFechas = document.getElementById('switchTipoFiltro').checked;
  if(usaFechas) {
    const d = document.getElementById('fechaDesde').value || "-";
    const h = document.getElementById('fechaHasta').value || "-";
    textoRango = `Periodo: ${d} al ${h}`;
  } else {
    const d = document.getElementById('boletaDesde').value || "Inicio";
    const h = document.getElementById('boletaHasta').value || "Final";
    textoRango = `Rango Boletas: ${d} al ${h}`;
  }

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(textoRango, 14, 28);

  const totalVentas = document.getElementById('sumTotalVentas').innerText;
  const caja = document.getElementById('sumIngresosReales').innerText;
  const cobrar = document.getElementById('sumPorCobrar').innerText;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Ventas (Devengado): ${totalVentas}`, 14, 40);
  doc.setTextColor(40, 167, 69); 
  doc.text(`Ingresos Reales (Caja): ${caja}`, 85, 40);
  doc.setTextColor(220, 53, 69); 
  doc.text(`Por Cobrar (Pendiente): ${cobrar}`, 150, 40);

  const bodyData = datosFiltradosGlobal.map(fila => {
    let fechaHtml = formatearFechaTabla(fila[6], fila[1]);
    let fechaTextoPlano = fechaHtml.replace(/<[^>]*>?/gm, ' ').trim(); 

    return [
      fila[0], 
      fechaTextoPlano, 
      fila[8], 
      `S/ ${fila[2].toFixed(2)}`, 
      `S/ ${fila[3].toFixed(2)}`, 
      `S/ ${fila[4].toFixed(2)}`, 
      fila[7], 
      fila[5]  
    ];
  });

  doc.autoTable({
    startY: 48,
    head: [['Boleta', 'Fecha', 'Categoría', 'Total', 'A Cuenta', 'Saldo', 'Método', 'Estado']],
    body: bodyData,
    theme: 'grid',
    headStyles: { fillColor: [43, 48, 53] }, 
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [244, 247, 246] }
  });

  let nombreArchivo = `Reporte_Natallis.pdf`;
  doc.save(nombreArchivo);
}
