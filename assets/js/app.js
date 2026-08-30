/* ============================================================
   FLEET MAINTENANCE — lógica de la aplicación
   Todo se guarda en localStorage del navegador. Sin backend.
   ============================================================ */

const LS_VEHICLES = "fm_vehicles";
const LS_RECORDS = "fm_records";
const LS_PLAN = "fm_plan";
const LS_CURRENT = "fm_current_vehicle";
const LS_ORDER_SEQ = "fm_order_seq";
const LS_SIDEBAR_COLLAPSED = "fm_sidebar_collapsed";
const LS_THEME = "fm_theme";
const LS_INVENTARIO = "fm_inventario";
const MAX_VEHICLES = 200;

const DEFAULT_PLAN = {
  ventanaAlertaKm: 5000,
  ventanaAlertaDias: 30,
  intervalos: [
    { km: 10000, tareas: ["Cambio de aceite de motor y filtro de aceite", "Inspección general de niveles y fugas", "Revisión básica de luces y frenos"] },
    { km: 20000, tareas: ["Cambio de filtro de aire de motor", "Revisión de sistema de frenos (pastillas/bandas)", "Rotación de neumáticos"] },
    { km: 30000, tareas: ["Cambio de filtro de combustible", "Revisión de suspensión y dirección", "Chequeo de batería y sistema eléctrico"] },
    { km: 40000, tareas: ["Cambio de aceite de caja de cambios (transmisión)", "Revisión de embrague", "Cambio de filtro de aire de cabina"] },
    { km: 50000, tareas: ["Cambio de refrigerante", "Revisión de correas y tensores", "Alineación y balanceo"] },
    { km: 60000, tareas: ["Cambio de aceite de diferencial (eje trasero)", "Revisión de sistema de escape y post-tratamiento Euro VI (SCR/AdBlue)", "Inspección de turbo e inyectores"] },
    { km: 80000, tareas: ["Cambio de filtro de DEF/Urea (SCR)", "Revisión completa del sistema de frenos", "Cambio de aceite de motor (ciclo extendido)"] },
    { km: 100000, tareas: ["Overhaul mayor: motor, caja y diferencial", "Revisión completa del sistema Euro VI (SCR-EGR-DPF)", "Cambio de correas de distribución y accesorios"] }
  ]
};

const SEED_VEHICLES = [
  { id: "v1", placa: "FVZ-001", marca: "UD Trucks", modelo: "FVZ", anio: 2026, config: "Camión Rígido 6x2", vin: "9F2FVZ2026EU6X0001", normativa: "Euro VI", km: 148250, estado: "Operativo", foto: null, oculto: false, conductores: ["Andrés Gómez"], numeroMotor: "MOT-FVZ-2026-0001", combustible: "Diésel", capacidadCarga: "8.500 kg", vencimientoSoat: "2026-09-15", vencimientoTecnomecanica: "2027-06-01" },
  { id: "v2", placa: "XYZ-789", marca: "Freightliner", modelo: "Cascadia", anio: 2022, config: "Tractocamión 6x4", vin: "1FUJHHDR0NLAA0789", normativa: "Euro V", km: 95400, estado: "En Taller", foto: null, oculto: false, conductores: [], numeroMotor: "", combustible: "Diésel", capacidadCarga: "", vencimientoSoat: "", vencimientoTecnomecanica: "" },
  { id: "v3", placa: "ABC-123", marca: "Volvo", modelo: "FH", anio: 2023, config: "Tractocamión 6x4", vin: "YV2RTC0A0PA000123", normativa: "Euro VI", km: 62000, estado: "Operativo", foto: null, oculto: false, conductores: [], numeroMotor: "", combustible: "Diésel", capacidadCarga: "", vencimientoSoat: "2026-07-10", vencimientoTecnomecanica: "" }
];

const SEED_INVENTARIO = [
  { id: "i1", nombre: "Filtro de aceite", categoria: "consumible", cantidad: 12, unidad: "unidad", minimo: 5 },
  { id: "i2", nombre: "Filtro de aire", categoria: "consumible", cantidad: 3, unidad: "unidad", minimo: 5 },
  { id: "i3", nombre: "Filtro de combustible", categoria: "consumible", cantidad: 9, unidad: "unidad", minimo: 4 },
  { id: "i4", nombre: "Correa de accesorios", categoria: "consumible", cantidad: 6, unidad: "unidad", minimo: 3 },
  { id: "i5", nombre: "Banda de rueda (llanta)", categoria: "consumible", cantidad: 8, unidad: "unidad", minimo: 4 },
  { id: "i6", nombre: "Tornillería rueda 22mm", categoria: "consumible", cantidad: 150, unidad: "unidad", minimo: 50 },
  { id: "i7", nombre: "Juego de llaves mixtas", categoria: "herramienta", cantidad: 2, unidad: "juego", minimo: 1 },
  { id: "i8", nombre: "Gato hidráulico", categoria: "herramienta", cantidad: 1, unidad: "unidad", minimo: 1 }
];

function seedRecords() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  return [
    { id: "M1001", vehicleId: "v1", tipo: "preventivo", descripcion: "Cambio de aceite de motor y filtro, inspección general", prioridad: "media", mecanico: "Carlos Pérez", estado: "en-curso", fecha: iso(today), costo: 450, kmAt: 150000, fotos: [] },
    { id: "M1002", vehicleId: "v2", tipo: "correctivo", descripcion: "Fuga de aire en sistema de frenos", prioridad: "alta", mecanico: "", estado: "pendiente", fecha: iso(today), costo: 320, fotos: [] },
    { id: "M1003", vehicleId: "v2", tipo: "correctivo", descripcion: "Cambio de aceite por derrame en cárter", prioridad: "media", mecanico: "", estado: "en-curso", fecha: iso(today), costo: 180, fotos: [] }
  ];
}

/* ---------------- Estado en memoria (respaldado en localStorage) --------------- */
let vehicles = [];
let records = [];
let inventario = [];
let plan = DEFAULT_PLAN;
let currentVehicleId = null;
let orderSeq = 1004;
let currentView = "dashboard";

/* ---------------- Utilidades ---------------- */
function uid(prefix = "v") { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function nextOrderId() { const id = "M" + orderSeq; orderSeq++; save(LS_ORDER_SEQ, orderSeq); return id; }
function fmtKm(n) { return (n || 0).toLocaleString("es-CO"); }
function fmtMoney(n) { return "$" + (n || 0).toLocaleString("es-CO"); }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function toast(msg, type = "") {
  const wrap = document.getElementById("toast-wrap");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
function escapeHtml(s) {
  return (s || "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- Persistencia inicial ---------------- */
function loadState() {
  vehicles = load(LS_VEHICLES, null);
  if (!vehicles) { vehicles = SEED_VEHICLES.map((v) => ({ ...v })); save(LS_VEHICLES, vehicles); }

  records = load(LS_RECORDS, null);
  if (!records) { records = seedRecords(); save(LS_RECORDS, records); }

  inventario = load(LS_INVENTARIO, null);
  if (!inventario) { inventario = SEED_INVENTARIO.map((i) => ({ ...i })); save(LS_INVENTARIO, inventario); }

  plan = load(LS_PLAN, null) || DEFAULT_PLAN;
  orderSeq = load(LS_ORDER_SEQ, 1004);
  currentVehicleId = load(LS_CURRENT, null) || (vehicles[0] && vehicles[0].id);
}

/* ---------------- Cálculo de alertas de mantenimiento preventivo ----------------
   Plan cíclico: cada intervalo (10k, 20k, 30k ... 100k) se repite indefinidamente.
   Esto funciona igual para un vehículo con 10.000 km que con 100.000.000 km,
   sin necesidad de una tabla infinita de mantenimientos.
------------------------------------------------------------------------------- */
function nextDueForInterval(km, intervalKm) {
  if (km <= 0) return intervalKm;
  if (km % intervalKm === 0) return km;
  return Math.ceil(km / intervalKm) * intervalKm;
}

function computeVehicleAlerts(vehicle) {
  const km = vehicle.km || 0;
  const windowKm = plan.ventanaAlertaKm || 5000;
  const dueMap = {}; // nextDueKm -> { tareas:Set, maxInterval }

  // Se agrupan TODOS los próximos vencimientos (no solo los que ya están dentro de la
  // ventana de alerta), para que siempre se pueda ver y agendar el próximo mantenimiento
  // aunque todavía falten más km que la ventana configurada.
  plan.intervalos.forEach((iv) => {
    const nextDue = nextDueForInterval(km, iv.km);
    if (!dueMap[nextDue]) dueMap[nextDue] = { tareas: new Set(), maxInterval: iv.km };
    iv.tareas.forEach((t) => dueMap[nextDue].tareas.add(t));
    dueMap[nextDue].maxInterval = Math.max(dueMap[nextDue].maxInterval, iv.km);
  });

  const groups = Object.keys(dueMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => {
      const remaining = k - km;
      return {
        dueKm: k,
        remaining,
        tareas: Array.from(dueMap[k].tareas),
        cycleLength: dueMap[k].maxInterval,
        vencido: remaining <= 0,
        proximo: remaining > 0 && remaining <= windowKm
      };
    });

  // el próximo grupo (groups[0]) siempre existe si hay intervalos configurados: es el
  // próximo punto de servicio combinado, sin importar qué tan lejos esté en km.
  const next = groups[0] || null;
  const cycleLength = next ? next.cycleLength : 0;
  const previousDue = next ? next.dueKm - cycleLength : 0;
  const progressPct = next && cycleLength > 0 ? Math.min(100, Math.max(0, ((km - previousDue) / cycleLength) * 100)) : 0;

  return {
    groups,
    next,
    overallDue: next ? next.dueKm : null,
    remainingOverall: next ? next.remaining : Infinity,
    progressPct
  };
}

/* ---------------- Alertas por documentos (SOAT/seguro, revisión técnico-mecánica) ----------------
   A diferencia del preventivo (que se calcula por kilometraje), estos vencen por fecha.
------------------------------------------------------------------------------- */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  return Math.round((target - today) / 86400000);
}

function docEstado(dias, windowDays) {
  if (dias === null) return "sin-registrar";
  if (dias <= 0) return "vencido";
  if (dias <= windowDays) return "proximo";
  return "ok";
}

function computeDocAlerts(vehicle) {
  const windowDays = plan.ventanaAlertaDias || 30;
  return [
    { key: "soat", label: "SOAT / Seguro obligatorio", fecha: vehicle.vencimientoSoat, dias: daysUntil(vehicle.vencimientoSoat), estado: docEstado(daysUntil(vehicle.vencimientoSoat), windowDays) },
    { key: "tecnomecanica", label: "Revisión Técnico-Mecánica", fecha: vehicle.vencimientoTecnomecanica, dias: daysUntil(vehicle.vencimientoTecnomecanica), estado: docEstado(daysUntil(vehicle.vencimientoTecnomecanica), windowDays) }
  ];
}

function docBadgeHtml(doc) {
  const cls = doc.estado === "vencido" ? "danger" : doc.estado === "proximo" ? "warn" : doc.estado === "ok" ? "ok" : "";
  const texto =
    doc.estado === "vencido" ? `Vencido hace ${Math.abs(doc.dias)} día(s)` :
    doc.estado === "proximo" ? `Vence en ${doc.dias} día(s)` :
    doc.estado === "ok" ? `Vigente hasta ${doc.fecha}` :
    "Sin registrar";
  return `<div class="doc-chip">
    <div class="doc-chip-label">${escapeHtml(doc.label)}</div>
    ${cls ? `<span class="badge ${cls}"><span class="badge-dot"></span>${escapeHtml(texto)}</span>` : `<span class="badge" style="color:var(--text-dim);border-color:var(--border);">${texto}</span>`}
  </div>`;
}

/* ---------------- Alertas Importantes (Panel Principal) ----------------
   Junta, de toda la flota y el inventario (no solo del vehículo seleccionado),
   lo más urgente: documentos vencidos/próximos, preventivos vencidos/próximos,
   correctivos de prioridad alta abiertos, e ítems de inventario con stock bajo.
------------------------------------------------------------------------------- */
function computeAllAlerts() {
  const alerts = [];
  const activeVehicles = vehicles.filter((v) => !v.oculto);

  activeVehicles.forEach((v) => {
    computeDocAlerts(v).forEach((d) => {
      if (d.estado === "vencido") {
        alerts.push({ urgencia: 0, icon: "shield", texto: `<b>${escapeHtml(v.placa)}</b> — ${escapeHtml(d.label)} vencido hace ${Math.abs(d.dias)} día(s)`, vehicleId: v.id, target: "dashboard" });
      } else if (d.estado === "proximo") {
        alerts.push({ urgencia: 1, icon: "shield", texto: `<b>${escapeHtml(v.placa)}</b> — ${escapeHtml(d.label)} vence en ${d.dias} día(s)`, vehicleId: v.id, target: "dashboard" });
      }
    });
    const pa = computeVehicleAlerts(v);
    if (pa.next && pa.next.vencido) {
      alerts.push({ urgencia: 0, icon: "wrench", texto: `<b>${escapeHtml(v.placa)}</b> — preventivo vencido (a los ${fmtKm(pa.next.dueKm)} km)`, vehicleId: v.id, target: "dashboard" });
    } else if (pa.next && pa.next.proximo) {
      alerts.push({ urgencia: 1, icon: "wrench", texto: `<b>${escapeHtml(v.placa)}</b> — preventivo próximo (faltan ${fmtKm(pa.next.remaining)} km)`, vehicleId: v.id, target: "dashboard" });
    }
  });

  records
    .filter((r) => r.tipo === "correctivo" && r.estado !== "completado" && r.prioridad === "alta")
    .forEach((r) => {
      const v = vehicles.find((x) => x.id === r.vehicleId);
      alerts.push({ urgencia: 0, icon: "alert", texto: `<b>${v ? escapeHtml(v.placa) : "—"}</b> — correctivo urgente: ${escapeHtml(r.descripcion)}`, vehicleId: r.vehicleId, target: "correctivos" });
    });

  inventario
    .filter((i) => Number(i.cantidad) <= Number(i.minimo))
    .forEach((i) => {
      alerts.push({ urgencia: 1, icon: "box", texto: `<b>${escapeHtml(i.nombre)}</b> — stock bajo (${i.cantidad} ${escapeHtml(i.unidad || "unidad")}, mínimo ${i.minimo})`, target: "inventario" });
    });

  alerts.sort((a, b) => a.urgencia - b.urgencia);
  return alerts;
}

function renderAlertasImportantes() {
  const alerts = computeAllAlerts();
  const list = document.getElementById("alertas-list");
  const countLabel = document.getElementById("alertas-count-label");
  if (alerts.length === 0) {
    list.innerHTML = `<div class="alert-empty"><span data-icon="check"></span> Sin alertas importantes por ahora — todo al día.</div>`;
    countLabel.textContent = "";
    return;
  }
  const TOP_N = 8;
  const shown = alerts.slice(0, TOP_N);
  countLabel.textContent = alerts.length > TOP_N ? `mostrando ${TOP_N} de ${alerts.length}` : `${alerts.length} alerta(s)`;
  list.innerHTML = shown.map((a, i) => `
    <div class="alert-row">
      <span class="alert-icon" data-icon="${a.icon}" style="color:${a.urgencia === 0 ? "var(--danger)" : "var(--warn)"};"></span>
      <span class="alert-text">${a.texto}</span>
      <button class="btn ghost" data-idx="${i}">Ver</button>
    </div>`).join("");
  list.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const a = shown[Number(btn.dataset.idx)];
      if (a.vehicleId) { currentVehicleId = a.vehicleId; save(LS_CURRENT, currentVehicleId); }
      if (a.target && a.target !== "dashboard") switchView(a.target);
      else renderAll();
    });
  });
}

/* ---------------- Navegación entre vistas ---------------- */
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById("view-" + view).classList.remove("hidden");
  document.querySelectorAll(".nav-item[data-view]").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
  syncNavGroupsWithView(view);
  renderAll();
}

/* ---------------- Grupos plegables del menú (Mantenimientos, Reportes) ---------------- */
const NAV_GROUPS = { mantenimiento: ["preventivos", "correctivos", "historial"], reportes: ["kpis", "disponibilidad", "costos"] };

function setNavGroupOpen(group, open) {
  const submenu = document.querySelector(`.nav-submenu[data-submenu="${group}"]`);
  const toggle = document.querySelector(`.nav-group-toggle[data-group="${group}"]`);
  if (!submenu || !toggle) return;
  submenu.classList.toggle("open", open);
  toggle.classList.toggle("open", open);
}

function toggleNavGroup(group) {
  const submenu = document.querySelector(`.nav-submenu[data-submenu="${group}"]`);
  setNavGroupOpen(group, submenu ? !submenu.classList.contains("open") : true);
}

function syncNavGroupsWithView(view) {
  Object.entries(NAV_GROUPS).forEach(([group, views]) => {
    if (views.includes(view)) setNavGroupOpen(group, true);
  });
}

/* ---------------- Render: KPIs ---------------- */
function renderKpis() {
  const activos = vehicles.filter((v) => v.estado !== "Fuera de Servicio" && !v.oculto).length;
  const prevPend = records.filter((r) => r.tipo === "preventivo" && r.estado !== "completado").length;
  const corrCurso = records.filter((r) => r.tipo === "correctivo" && r.estado !== "completado").length;
  const mes = new Date().toISOString().slice(0, 7);
  const costosMes = records.filter((r) => (r.fecha || "").slice(0, 7) === mes).reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const docsAlerta = vehicles.filter((v) => !v.oculto && computeDocAlerts(v).some((d) => d.estado === "vencido" || d.estado === "proximo")).length;

  document.getElementById("kpi-vehiculos").textContent = activos;
  document.getElementById("kpi-preventivos").textContent = prevPend;
  document.getElementById("kpi-correctivos").textContent = corrCurso;
  document.getElementById("kpi-costos").textContent = fmtMoney(costosMes);
  document.getElementById("kpi-documentos").textContent = docsAlerta;

  const hasAlerts = vehicles.some((v) => computeVehicleAlerts(v).remainingOverall <= plan.ventanaAlertaKm) || corrCurso > 0 || docsAlerta > 0;
  document.getElementById("notif-dot").classList.toggle("hidden", !hasAlerts);
}

/* ---------------- Render: selector de vehículo actual ---------------- */
function renderVehicleSelector() {
  const sel = document.getElementById("select-current-vehicle");
  const q = (document.getElementById("search-input").value || "").toLowerCase();
  const estadoFilter = document.getElementById("filter-estado").value;
  const filtered = vehicles.filter((v) =>
    !v.oculto &&
    (!q || (v.placa + v.marca + v.modelo).toLowerCase().includes(q)) &&
    (!estadoFilter || v.estado === estadoFilter)
  );
  if (filtered.length === 0) { sel.innerHTML = `<option value="">Sin coincidencias</option>`; return; }
  sel.innerHTML = filtered.map((v) => `<option value="${v.id}">${escapeHtml(v.placa)} — ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</option>`).join("");
  if (!filtered.find((v) => v.id === currentVehicleId)) {
    // el vehículo actual quedó fuera del filtro/búsqueda: salta al primer resultado para que la ficha de abajo siempre coincida con el selector
    currentVehicleId = filtered[0].id;
    save(LS_CURRENT, currentVehicleId);
  }
  sel.value = currentVehicleId;
}

/* ---------------- Render: tarjeta de vehículo actual (Panel Principal) ---------------- */
function renderVehicleCard() {
  const vehicle = vehicles.find((v) => v.id === currentVehicleId);
  const card = document.getElementById("vehicle-card");
  if (!vehicle) { card.innerHTML = `<div class="empty-state">No hay vehículos registrados. Ve a "Vehículos" para agregar el primero.</div>`; return; }
  if (vehicle.oculto) { card.innerHTML = `<div class="empty-state">Este vehículo está oculto. Ve a "Vehículos" para mostrarlo o elige otro en el selector de arriba.</div>`; return; }

  const alerts = computeVehicleAlerts(vehicle);
  const badgeClass = vehicle.estado === "Operativo" ? "ok" : vehicle.estado === "En Taller" ? "warn" : "danger";
  const kmDigits = String(vehicle.km || 0).split("");
  const urgent = alerts.remainingOverall <= plan.ventanaAlertaKm;

  card.innerHTML = `
    <div class="vehicle-card-head">
      <h2>VEHÍCULO ACTUAL: [Placa: <b>${escapeHtml(vehicle.placa)}</b>]</h2>
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn ghost" id="btn-edit-vehicle"><span data-icon="edit"></span> Editar vehículo</button>
        <span class="badge ${badgeClass}"><span class="badge-dot"></span>ESTADO: ${escapeHtml(vehicle.estado.toUpperCase())}</span>
      </div>
    </div>
    <div class="vehicle-body">
      <div class="vehicle-photo-wrap">
        ${vehicle.foto ? `<img src="${vehicle.foto}" alt="Foto de ${escapeHtml(vehicle.placa)}">` : `<div class="placeholder"><span data-icon="truck"></span><span>Sin foto</span></div>`}
        <label class="photo-upload-btn" for="vehicle-photo-input"><span data-icon="camera"></span> Subir foto</label>
        <input type="file" id="vehicle-photo-input" accept="image/*" class="hidden">
      </div>
      <div>
        <div class="vehicle-info-grid">
          <div><div class="li">Marca</div><div class="val">${escapeHtml(vehicle.marca)}</div></div>
          <div><div class="li">Modelo</div><div class="val">${escapeHtml(vehicle.modelo)}</div></div>
          <div><div class="li">Año</div><div class="val">${vehicle.anio}</div></div>
          <div><div class="li">Configuración</div><div class="val">${escapeHtml(vehicle.config)}</div></div>
          <div><div class="li">Normativa</div><div class="val">${escapeHtml(vehicle.normativa)}</div></div>
          <div><div class="li">VIN</div><div class="val">${escapeHtml(vehicle.vin)}</div></div>
          <div><div class="li">Número de Motor</div><div class="val">${vehicle.numeroMotor ? escapeHtml(vehicle.numeroMotor) : "Sin registrar"}</div></div>
          <div><div class="li">Combustible</div><div class="val">${escapeHtml(vehicle.combustible || "Sin registrar")}</div></div>
          <div><div class="li">Capacidad de Carga / PBV</div><div class="val">${vehicle.capacidadCarga ? escapeHtml(vehicle.capacidadCarga) : "Sin registrar"}</div></div>
          <div style="grid-column:1/-1;"><div class="li">Conductor(es) asignado(s)</div><div class="val">${vehicle.conductores && vehicle.conductores.length ? escapeHtml(vehicle.conductores.join(", ")) : "Sin asignar"}</div></div>
        </div>
        <div class="doc-chips">${computeDocAlerts(vehicle).map(docBadgeHtml).join("")}</div>
        <div class="li" style="margin-bottom:6px;">Kilometraje Actual</div>
        <div class="odometer">
          <div class="odometer-display">${kmDigits.map((d) => `<div class="odometer-digit">${d}</div>`).join("")}</div>
          <span class="km-unit">KM</span>
          <button class="btn ghost" id="btn-edit-km" style="margin-left:auto;">Actualizar KM</button>
        </div>
        <div class="progress-block">
          <div class="progress-label">
            <span>Siguiente preventivo: ${fmtKm(alerts.overallDue)} km</span>
            <span>${alerts.remainingOverall <= 0 ? "Vencido" : "Faltan " + fmtKm(alerts.remainingOverall) + " km"}</span>
          </div>
          <div class="progress-bar ${urgent ? "urgent" : ""}"><div style="width:${alerts.progressPct}%"></div></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("vehicle-photo-input").addEventListener("change", (e) => handlePhotoUpload(e, vehicle));
  document.getElementById("btn-edit-km").addEventListener("click", () => promptEditKm(vehicle));
  document.getElementById("btn-edit-vehicle").addEventListener("click", () => openAddVehicleModal(vehicle));
}

function promptEditKm(vehicle) {
  openModal(`
    <h2>Actualizar kilometraje — ${escapeHtml(vehicle.placa)}</h2>
    <div class="field"><label>Kilometraje actual</label><input type="number" id="modal-km-input" value="${vehicle.km || 0}"></div>
    <button class="btn primary block" id="modal-km-save">Guardar</button>
  `);
  document.getElementById("modal-km-save").addEventListener("click", () => {
    const val = Number(document.getElementById("modal-km-input").value);
    if (isNaN(val) || val < 0) { toast("Ingresa un kilometraje válido", "danger"); return; }
    vehicle.km = Math.round(val);
    save(LS_VEHICLES, vehicles);
    closeModal();
    toast("Kilometraje actualizado", "ok");
    renderAll();
  });
}

/* ---------------- Foto: redimensiona antes de guardar en localStorage ---------------- */
function handlePhotoUpload(e, target, onDone) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 480;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      if (target) { target.foto = dataUrl; save(LS_VEHICLES, vehicles); toast("Foto actualizada", "ok"); renderAll(); }
      if (onDone) onDone(dataUrl);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------------- Render: panel de preventivo (tareas alertadas) ---------------- */
function tareasHechasPara(vehicle, dueKm) {
  return (vehicle.tareasCompletadas && vehicle.tareasCompletadas.dueKm === dueKm) ? vehicle.tareasCompletadas.hechas : [];
}

function renderPreventivoPanel() {
  const vehicle = vehicles.find((v) => v.id === currentVehicleId);
  const list = document.getElementById("preventivo-task-list");
  if (!vehicle) { list.innerHTML = ""; return; }
  const alerts = computeVehicleAlerts(vehicle);
  const group = alerts.next;
  if (!group) {
    list.innerHTML = `<li><span data-icon="check"></span> No hay intervalos de mantenimiento configurados (revisa Configuración)</li>`;
    document.getElementById("btn-agendar-cita").disabled = true;
    list.dataset.dueKm = "";
    return;
  }
  const hechas = tareasHechasPara(vehicle, group.dueKm);
  const pendientes = group.tareas.filter((t) => !hechas.includes(t));
  list.dataset.dueKm = group.dueKm;

  if (pendientes.length === 0) {
    list.innerHTML = `<li><span data-icon="check"></span> Ya agendaste todas las tareas de este ciclo (a los ${fmtKm(group.dueKm)} km). Aparecerán tareas nuevas cuando el kilometraje avance.</li>`;
    document.getElementById("btn-agendar-cita").disabled = true;
    return;
  }

  document.getElementById("btn-agendar-cita").disabled = false;
  list.classList.toggle("overdue", group.vencido);
  const estadoLabel = group.vencido ? "Vencido" : group.proximo ? "Próximo" : `Programado · faltan ${fmtKm(group.remaining)} km`;
  const estadoClass = group.vencido ? "danger" : group.proximo ? "warn" : "ok";
  list.innerHTML =
    `<li class="task-list-status"><span class="badge ${estadoClass}"><span class="badge-dot"></span>${estadoLabel}</span><span style="margin-left:auto;color:var(--text-dim);font-size:12px;">Vencimiento a los ${fmtKm(group.dueKm)} km</span></li>` +
    pendientes.map((t) => `<li><input type="checkbox" checked value="${escapeHtml(t)}"> <b>${escapeHtml(t)}</b></li>`).join("");
  document.getElementById("prev-fecha").value = document.getElementById("prev-fecha").value || todayIso();
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btn-agendar-cita") agendarCita();
});

function agendarCita() {
  const vehicle = vehicles.find((v) => v.id === currentVehicleId);
  const list = document.getElementById("preventivo-task-list");
  if (!vehicle || !list.dataset.dueKm) return;
  const alerts = computeVehicleAlerts(vehicle);
  const group = alerts.next;
  if (!group) return;

  const seleccionadas = Array.from(list.querySelectorAll("input[type='checkbox']:checked")).map((c) => c.value);
  if (seleccionadas.length === 0) { toast("Selecciona al menos una tarea para agendar", "danger"); return; }

  const mecanico = document.getElementById("prev-mecanico").value.trim();
  const prioridad = document.getElementById("prev-prioridad").value;
  const fecha = document.getElementById("prev-fecha").value || todayIso();
  const costo = Number(document.getElementById("prev-costo").value) || 0;
  const notas = document.getElementById("prev-notas").value.trim();

  records.push({
    id: nextOrderId(),
    vehicleId: vehicle.id,
    tipo: "preventivo",
    descripcion: seleccionadas.join(", "),
    notas,
    prioridad, mecanico, estado: "pendiente", fecha, costo, kmAt: group.dueKm, fotos: []
  });

  // las tareas seleccionadas quedan marcadas como agendadas para este ciclo (no vuelven a aparecer);
  // las que no se marcaron siguen pendientes y reaparecen la próxima vez.
  const hechasPrevias = tareasHechasPara(vehicle, group.dueKm);
  vehicle.tareasCompletadas = { dueKm: group.dueKm, hechas: [...hechasPrevias, ...seleccionadas] };
  save(LS_VEHICLES, vehicles);

  save(LS_RECORDS, records);
  document.getElementById("prev-mecanico").value = "";
  document.getElementById("prev-costo").value = "";
  document.getElementById("prev-notas").value = "";
  toast("Cita de mantenimiento preventivo agendada", "ok");
  renderAll();
}

/* ---------------- Correctivo: fotos adjuntas en memoria temporal ---------------- */
let pendingCorrectivoPhotos = [];

function renderCorrectivoPanel() {
  const vehicle = vehicles.find((v) => v.id === currentVehicleId);
  document.getElementById("corr-vehiculo-display").value = vehicle ? `${vehicle.placa} — ${vehicle.marca} ${vehicle.modelo}` : "";
}

document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "corr-photo-input") {
    Array.from(e.target.files).slice(0, 4).forEach((file) => {
      const fakeEvent = { target: { files: [file] } };
      handlePhotoUpload(fakeEvent, null, (dataUrl) => {
        pendingCorrectivoPhotos.push(dataUrl);
        renderCorrectivoPhotoThumbs();
      });
    });
  }
});

function renderCorrectivoPhotoThumbs() {
  const wrap = document.getElementById("corr-photo-attach");
  const addBtn = wrap.querySelector(".add-photo-btn").outerHTML;
  const input = wrap.querySelector("#corr-photo-input").outerHTML;
  wrap.innerHTML = pendingCorrectivoPhotos.map((p) => `<img class="photo-thumb" src="${p}">`).join("") + addBtn + input;
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btn-ingresar-correctivo") ingresarCorrectivo();
});

function ingresarCorrectivo() {
  const vehicle = vehicles.find((v) => v.id === currentVehicleId);
  if (!vehicle) { toast("Selecciona un vehículo primero", "danger"); return; }
  const descripcion = document.getElementById("corr-descripcion").value.trim();
  if (!descripcion) { toast("Describe el problema antes de ingresar el correctivo", "danger"); return; }
  const prioridad = document.getElementById("corr-prioridad").value;
  const estado = document.getElementById("corr-estado").value;
  const costo = Number(document.getElementById("corr-costo").value) || 0;

  records.push({
    id: nextOrderId(), vehicleId: vehicle.id, tipo: "correctivo", descripcion,
    prioridad, mecanico: "", estado, fecha: todayIso(), costo, fotos: pendingCorrectivoPhotos.slice()
  });
  save(LS_RECORDS, records);
  document.getElementById("corr-descripcion").value = "";
  document.getElementById("corr-costo").value = "";
  pendingCorrectivoPhotos = [];
  renderCorrectivoPhotoThumbs();
  toast("Correctivo ingresado", "ok");
  renderAll();
}

/* ---------------- Render: tabla de seguimiento (Panel Principal) ---------------- */
function renderRecordsTable() {
  const tbody = document.getElementById("records-tbody");
  const active = records.filter((r) => r.estado !== "completado").sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  document.getElementById("table-count-label").textContent = active.length + " activos";
  if (active.length === 0) { tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Sin mantenimientos activos</td></tr>`; return; }
  tbody.innerHTML = active.map((r) => rowHtml(r)).join("");
  wireRowActions(tbody);
}

function rowHtml(r) {
  const vehicle = vehicles.find((v) => v.id === r.vehicleId) || { placa: "—" };
  const flag = r.prioridad === "alta" ? "alta" : r.prioridad === "baja" ? "baja" : "media";
  const tooltip = r.descripcion + (r.notas ? " — Notas: " + r.notas : "");
  return `<tr data-id="${r.id}">
    <td>${r.id}</td>
    <td>${escapeHtml(vehicle.placa)}</td>
    <td><span class="pill ${r.tipo}">${r.tipo === "preventivo" ? "Preventivo" : "Correctivo"}</span></td>
    <td title="${escapeHtml(tooltip)}">${escapeHtml(r.descripcion.length > 40 ? r.descripcion.slice(0, 40) + "…" : r.descripcion)}${r.notas ? ` <span class="note-flag" data-icon="doc" title="Tiene notas adicionales"></span>` : ""}</td>
    <td><span class="flag ${flag}"></span>${cap(r.prioridad)}</td>
    <td>${escapeHtml(r.mecanico || "Sin asignar")}</td>
    <td>${r.fecha}</td>
    <td>${fmtMoney(r.costo)}</td>
    <td><span class="status-text ${r.estado}">${statusLabel(r.estado)}</span></td>
    <td class="row-actions">
      <button data-act="edit">Editar</button>
      ${r.estado !== "completado" ? `<button data-act="complete">Completar</button>` : ""}
      <button data-act="delete">Eliminar</button>
    </td>
  </tr>`;
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function statusLabel(s) { return s === "pendiente" ? "Pendiente" : s === "en-curso" ? "En Curso" : "Completado"; }

function wireRowActions(scopeEl) {
  (scopeEl || document).querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = tr.dataset.id;
        const rec = records.find((r) => r.id === id);
        if (!rec) return;
        if (btn.dataset.act === "edit") { openEditRecordModal(rec); return; }
        if (btn.dataset.act === "complete") { rec.estado = "completado"; toast("Marcado como completado", "ok"); }
        if (btn.dataset.act === "delete") { records = records.filter((r) => r.id !== id); toast("Registro eliminado"); }
        save(LS_RECORDS, records);
        renderAll();
      });
    });
  });
}

/* ---------------- Editar un registro de mantenimiento (fecha, costo, estado, etc.) ---------------- */
function openEditRecordModal(rec) {
  const vehicle = vehicles.find((v) => v.id === rec.vehicleId);
  openModal(`
    <h2>Editar ${rec.tipo === "preventivo" ? "preventivo" : "correctivo"} — ${rec.id}</h2>
    <div class="field"><label>Vehículo</label><input value="${vehicle ? escapeHtml(vehicle.placa + " — " + vehicle.marca + " " + vehicle.modelo) : "Sin vehículo asociado"}" disabled></div>
    <div class="field"><label>Descripción</label><textarea id="e-descripcion">${escapeHtml(rec.descripcion)}</textarea></div>
    <div class="row2">
      <div class="field"><label>Prioridad</label>
        <select id="e-prioridad">
          <option value="alta" ${rec.prioridad === "alta" ? "selected" : ""}>Alta</option>
          <option value="media" ${rec.prioridad === "media" ? "selected" : ""}>Media</option>
          <option value="baja" ${rec.prioridad === "baja" ? "selected" : ""}>Baja</option>
        </select>
      </div>
      <div class="field"><label>Estado</label>
        <select id="e-estado">
          <option value="pendiente" ${rec.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
          <option value="en-curso" ${rec.estado === "en-curso" ? "selected" : ""}>En Curso</option>
          <option value="completado" ${rec.estado === "completado" ? "selected" : ""}>Completado</option>
        </select>
      </div>
    </div>
    <div class="row2">
      <div class="field"><label>Mecánico</label><input id="e-mecanico" value="${escapeHtml(rec.mecanico || "")}"></div>
      <div class="field"><label>Fecha</label><input type="date" id="e-fecha" value="${rec.fecha || ""}"></div>
    </div>
    <div class="field"><label>Costo estimado (USD)</label><input type="number" id="e-costo" value="${rec.costo || 0}"></div>
    <div class="field"><label>Notas adicionales</label><textarea id="e-notas">${escapeHtml(rec.notas || "")}</textarea></div>
    <button class="btn primary block" id="e-save">Guardar cambios</button>
  `);
  document.getElementById("e-save").addEventListener("click", () => {
    const descripcion = document.getElementById("e-descripcion").value.trim();
    if (!descripcion) { toast("La descripción no puede quedar vacía", "danger"); return; }
    rec.descripcion = descripcion;
    rec.prioridad = document.getElementById("e-prioridad").value;
    rec.estado = document.getElementById("e-estado").value;
    rec.mecanico = document.getElementById("e-mecanico").value.trim();
    rec.fecha = document.getElementById("e-fecha").value || rec.fecha;
    rec.costo = Number(document.getElementById("e-costo").value) || 0;
    rec.notas = document.getElementById("e-notas").value.trim();
    save(LS_RECORDS, records);
    closeModal();
    toast("Registro actualizado", "ok");
    renderAll();
  });
}

/* ---------------- Vista: Vehículos ---------------- */
function renderVehiculosView() {
  const ocultos = vehicles.filter((v) => v.oculto).length;
  document.getElementById("vehiculos-count-label").textContent =
    `${vehicles.length} / ${MAX_VEHICLES} vehículos registrados` + (ocultos ? ` · ${ocultos} oculto(s)` : "");
  const grid = document.getElementById("vgrid");
  const q = (document.getElementById("search-vehiculos").value || "").toLowerCase();
  const showHidden = document.getElementById("chk-show-hidden").checked;
  const filtered = vehicles.filter((v) => (showHidden || !v.oculto) && (!q || (v.placa + v.marca + v.modelo).toLowerCase().includes(q)));
  if (filtered.length === 0) { grid.innerHTML = `<div class="empty-state">No se encontraron vehículos.</div>`; return; }
  grid.innerHTML = filtered.map((v) => {
    const alerts = computeVehicleAlerts(v);
    const urgent = alerts.remainingOverall <= plan.ventanaAlertaKm;
    return `<div class="vcard ${v.oculto ? "vcard-hidden" : ""}" data-id="${v.id}">
      <div class="thumb">${v.foto ? `<img src="${v.foto}">` : `<div class="placeholder"><span data-icon="truck"></span><span>Sin foto</span></div>`}
        <div class="vcard-actions">
          <button class="vcard-btn" data-act="edit" title="Editar vehículo"><span data-icon="edit"></span></button>
          <button class="vcard-btn" data-act="toggle-hide" title="${v.oculto ? "Mostrar vehículo" : "Ocultar vehículo"}"><span data-icon="${v.oculto ? "eye" : "eye-off"}"></span></button>
          <button class="vcard-btn danger" data-act="delete" title="Eliminar vehículo"><span data-icon="trash"></span></button>
        </div>
        ${v.oculto ? `<span class="badge warn vcard-hidden-tag">Oculto</span>` : ""}
      </div>
      <div class="plate">${escapeHtml(v.placa)}</div>
      <div class="meta">${escapeHtml(v.marca)} ${escapeHtml(v.modelo)} · ${v.anio}</div>
      <div class="meta-driver"><span data-icon="user"></span>${v.conductores && v.conductores.length ? escapeHtml(v.conductores.join(", ")) : "Sin conductor asignado"}</div>
      <div class="kmrow"><span>${fmtKm(v.km)} km</span><span class="badge ${urgent ? "warn" : "ok"}">${urgent ? "Preventivo próximo" : "Al día"}</span></div>
      <button class="btn ghost block" data-act="hoja-vida" style="margin-top:10px;"><span data-icon="history"></span> Hoja de Vida</button>
    </div>`;
  }).join("");
  grid.querySelectorAll(".vcard").forEach((card) => {
    const v = vehicles.find((x) => x.id === card.dataset.id);
    card.querySelector("[data-act='hoja-vida']").addEventListener("click", (e) => {
      e.stopPropagation();
      switchView("historial");
      const sel = document.getElementById("historial-vehiculo");
      if (sel) { sel.value = v.id; renderHistorialView(); }
    });
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-act]")) return;
      currentVehicleId = card.dataset.id;
      save(LS_CURRENT, currentVehicleId);
      switchView("dashboard");
    });
    card.querySelector("[data-act='edit']").addEventListener("click", (e) => { e.stopPropagation(); if (v) openAddVehicleModal(v); });
    card.querySelector("[data-act='toggle-hide']").addEventListener("click", (e) => { e.stopPropagation(); if (v) toggleVehicleHidden(v); });
    card.querySelector("[data-act='delete']").addEventListener("click", (e) => { e.stopPropagation(); if (v) confirmDeleteVehicle(v); });
  });
}

function toggleVehicleHidden(v) {
  v.oculto = !v.oculto;
  save(LS_VEHICLES, vehicles);
  toast(v.oculto ? `${v.placa} ocultado — ya no cuenta como activo ni aparece en el tablero` : `${v.placa} vuelve a estar visible`, "ok");
  renderAll();
}

function confirmDeleteVehicle(v) {
  openModal(`
    <h2>Eliminar ${escapeHtml(v.placa)}</h2>
    <p>Se eliminará el vehículo por completo. Sus mantenimientos históricos no se borran, pero quedarán sin vehículo asociado. Esta acción no se puede deshacer.</p>
    <p style="color:var(--text-dim);font-size:12.5px;">Consejo: si solo quieres sacarlo temporalmente de la flota activa (por ejemplo, vendido o dado de baja) sin perder su historial, usa "Ocultar vehículo" en vez de eliminarlo.</p>
    <div class="row2">
      <button class="btn" id="cancel-delete-vehicle">Cancelar</button>
      <button class="btn danger" id="confirm-delete-vehicle">Sí, eliminar</button>
    </div>
  `);
  document.getElementById("cancel-delete-vehicle").addEventListener("click", closeModal);
  document.getElementById("confirm-delete-vehicle").addEventListener("click", () => {
    vehicles = vehicles.filter((x) => x.id !== v.id);
    save(LS_VEHICLES, vehicles);
    if (currentVehicleId === v.id) { currentVehicleId = vehicles[0] ? vehicles[0].id : null; save(LS_CURRENT, currentVehicleId); }
    closeModal();
    toast("Vehículo eliminado", "ok");
    renderAll();
  });
}

function openAddVehicleModal(existing) {
  const v = existing || { id: uid(), placa: "", marca: "", modelo: "", anio: new Date().getFullYear(), config: "", vin: "", normativa: "Euro VI", km: 0, estado: "Operativo", foto: null, oculto: false, conductores: [], numeroMotor: "", combustible: "Diésel", capacidadCarga: "", vencimientoSoat: "", vencimientoTecnomecanica: "" };
  if (!existing && vehicles.length >= MAX_VEHICLES) { toast(`Límite de ${MAX_VEHICLES} vehículos alcanzado`, "danger"); return; }
  openModal(`
    <h2>${existing ? "Editar vehículo" : "Agregar vehículo"}</h2>
    <div class="row2">
      <div class="field"><label>Placa</label><input id="f-placa" value="${escapeHtml(v.placa)}"></div>
      <div class="field"><label>Año</label><input id="f-anio" type="number" value="${v.anio}"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Marca</label><input id="f-marca" value="${escapeHtml(v.marca)}"></div>
      <div class="field"><label>Modelo</label><input id="f-modelo" value="${escapeHtml(v.modelo)}"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Configuración</label><input id="f-config" value="${escapeHtml(v.config)}" placeholder="Ej: Tractocamión 6x4"></div>
      <div class="field"><label>Normativa</label><input id="f-normativa" value="${escapeHtml(v.normativa)}" placeholder="Euro VI"></div>
    </div>
    <div class="row2">
      <div class="field"><label>VIN</label><input id="f-vin" value="${escapeHtml(v.vin)}"></div>
      <div class="field"><label>Kilometraje actual</label><input id="f-km" type="number" value="${v.km}"></div>
    </div>
    <div class="field"><label>Estado</label>
      <select id="f-estado">
        <option ${v.estado === "Operativo" ? "selected" : ""}>Operativo</option>
        <option ${v.estado === "En Taller" ? "selected" : ""}>En Taller</option>
        <option ${v.estado === "Fuera de Servicio" ? "selected" : ""}>Fuera de Servicio</option>
      </select>
    </div>
    <div class="field">
      <label>Conductor(es) asignado(s)</label>
      <input id="f-conductores" value="${escapeHtml((v.conductores || []).join("; "))}" placeholder="Ej: Juan Pérez; Carlos Gómez">
    </div>
    <div class="row2">
      <div class="field"><label>Número de motor</label><input id="f-motor" value="${escapeHtml(v.numeroMotor || "")}"></div>
      <div class="field"><label>Combustible</label>
        <select id="f-combustible">
          <option ${v.combustible === "Diésel" ? "selected" : ""}>Diésel</option>
          <option ${v.combustible === "Gasolina" ? "selected" : ""}>Gasolina</option>
          <option ${v.combustible === "Gas" ? "selected" : ""}>Gas</option>
          <option ${v.combustible === "Eléctrico" ? "selected" : ""}>Eléctrico</option>
          <option ${v.combustible === "Híbrido" ? "selected" : ""}>Híbrido</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Capacidad de carga / PBV</label><input id="f-capacidad" value="${escapeHtml(v.capacidadCarga || "")}" placeholder="Ej: 8.500 kg"></div>
    <div class="row2">
      <div class="field"><label>Vencimiento SOAT / seguro obligatorio</label><input type="date" id="f-soat" value="${v.vencimientoSoat || ""}"></div>
      <div class="field"><label>Vencimiento revisión técnico-mecánica</label><input type="date" id="f-tecno" value="${v.vencimientoTecnomecanica || ""}"></div>
    </div>
    <div class="field"><label>Foto del vehículo</label><input id="f-foto" type="file" accept="image/*"></div>
    <button class="btn primary block" id="f-save">Guardar</button>
    ${existing ? `
      <div class="row2" style="margin-top:10px;">
        <button class="btn" id="f-hide">${v.oculto ? "Mostrar vehículo" : "Ocultar vehículo"}</button>
        <button class="btn danger" id="f-delete">Eliminar vehículo</button>
      </div>` : ""}
  `);
  let newFoto = v.foto;
  document.getElementById("f-foto").addEventListener("change", (e) => handlePhotoUpload(e, null, (dataUrl) => { newFoto = dataUrl; }));
  document.getElementById("f-save").addEventListener("click", () => {
    const placa = document.getElementById("f-placa").value.trim().toUpperCase();
    if (!placa) { toast("La placa es obligatoria", "danger"); return; }
    const dup = vehicles.find((x) => x.placa === placa && x.id !== v.id);
    if (dup) { toast("Ya existe un vehículo con esa placa", "danger"); return; }
    v.placa = placa;
    v.marca = document.getElementById("f-marca").value.trim();
    v.modelo = document.getElementById("f-modelo").value.trim();
    v.anio = Number(document.getElementById("f-anio").value) || v.anio;
    v.config = document.getElementById("f-config").value.trim();
    v.normativa = document.getElementById("f-normativa").value.trim();
    v.vin = document.getElementById("f-vin").value.trim();
    v.km = Number(document.getElementById("f-km").value) || 0;
    v.estado = document.getElementById("f-estado").value;
    v.conductores = document.getElementById("f-conductores").value.split(";").map((s) => s.trim()).filter(Boolean);
    v.numeroMotor = document.getElementById("f-motor").value.trim();
    v.combustible = document.getElementById("f-combustible").value;
    v.capacidadCarga = document.getElementById("f-capacidad").value.trim();
    v.vencimientoSoat = document.getElementById("f-soat").value;
    v.vencimientoTecnomecanica = document.getElementById("f-tecno").value;
    v.foto = newFoto;
    if (!existing) vehicles.push(v);
    save(LS_VEHICLES, vehicles);
    if (!currentVehicleId) { currentVehicleId = v.id; save(LS_CURRENT, currentVehicleId); }
    closeModal();
    toast(existing ? "Vehículo actualizado" : "Vehículo agregado", "ok");
    renderAll();
  });
  if (existing) {
    document.getElementById("f-hide").addEventListener("click", () => { toggleVehicleHidden(v); closeModal(); });
    document.getElementById("f-delete").addEventListener("click", () => confirmDeleteVehicle(v));
  }
}

/* ---------------- CSV: importar / exportar / plantilla ---------------- */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cells[i] !== undefined ? cells[i] : ""));
    return obj;
  });
}

function importCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let rows;
    try { rows = parseCsv(e.target.result); } catch (err) { toast("No se pudo leer el CSV", "danger"); return; }
    let added = 0, updated = 0, skipped = 0;
    rows.forEach((row) => {
      if (!row.placa) { skipped++; return; }
      const placa = row.placa.toUpperCase();
      let v = vehicles.find((x) => x.placa === placa);
      if (!v) {
        if (vehicles.length >= MAX_VEHICLES) { skipped++; return; }
        v = { id: uid(), placa, marca: "", modelo: "", anio: new Date().getFullYear(), config: "", vin: "", normativa: "Euro VI", km: 0, estado: "Operativo", foto: null, oculto: false, conductores: [], numeroMotor: "", combustible: "Diésel", capacidadCarga: "", vencimientoSoat: "", vencimientoTecnomecanica: "" };
        vehicles.push(v);
        added++;
      } else { updated++; }
      v.marca = row.marca || v.marca;
      v.modelo = row.modelo || v.modelo;
      v.anio = Number(row.anio) || v.anio;
      v.config = row.configuracion || v.config;
      v.vin = row.vin || v.vin;
      v.normativa = row.normativa || v.normativa;
      v.km = row.km_actual !== "" && !isNaN(Number(row.km_actual)) ? Number(row.km_actual) : v.km;
      v.estado = row.estado || v.estado;
      if (row.conductores) v.conductores = row.conductores.split(";").map((s) => s.trim()).filter(Boolean);
      v.numeroMotor = row.numero_motor || v.numeroMotor;
      v.combustible = row.combustible || v.combustible;
      v.capacidadCarga = row.capacidad_carga || v.capacidadCarga;
      v.vencimientoSoat = row.vencimiento_soat || v.vencimientoSoat;
      v.vencimientoTecnomecanica = row.vencimiento_tecnomecanica || v.vencimientoTecnomecanica;
    });
    save(LS_VEHICLES, vehicles);
    toast(`Importación completa: ${added} agregados, ${updated} actualizados, ${skipped} omitidos`, "ok");
    renderAll();
  };
  reader.readAsText(file);
}

function exportCsv() {
  const headers = ["placa", "marca", "modelo", "anio", "configuracion", "vin", "normativa", "km_actual", "estado", "conductores", "numero_motor", "combustible", "capacidad_carga", "vencimiento_soat", "vencimiento_tecnomecanica"];
  const rows = vehicles.map((v) => [v.placa, v.marca, v.modelo, v.anio, v.config, v.vin, v.normativa, v.km, v.estado, (v.conductores || []).join(";"), v.numeroMotor || "", v.combustible || "", v.capacidadCarga || "", v.vencimientoSoat || "", v.vencimientoTecnomecanica || ""].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile("flota_" + todayIso() + ".csv", csv, "text/csv");
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- CSV: actualizar SOLO el kilometraje (flujo recurrente) ----------------
   Pensado para actualizar el odómetro de toda la flota periódicamente (ej. exportado
   de un GPS/telemetría): solo toca vehículos que ya existen (no crea ni borra nada,
   no toca marca/modelo/foto/etc.), emparejando por placa.
------------------------------------------------------------------------------- */
function exportKmTemplate() {
  const rows = vehicles.map((v) => `${v.placa},${v.km}`);
  const csv = ["placa,km_actual", ...rows].join("\n");
  downloadFile("plantilla_km_" + todayIso() + ".csv", csv, "text/csv");
}

function importKmCsvFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let rows;
    try { rows = parseCsv(e.target.result); } catch (err) { toast("No se pudo leer el CSV", "danger"); return; }
    let updated = 0, sinCambio = 0, noEncontrados = [];
    rows.forEach((row) => {
      if (!row.placa) return;
      const placa = row.placa.toUpperCase();
      const v = vehicles.find((x) => x.placa === placa);
      if (!v) { noEncontrados.push(placa); return; }
      const nuevoKm = Number(row.km_actual);
      if (row.km_actual === "" || isNaN(nuevoKm)) { sinCambio++; return; }
      v.km = Math.round(nuevoKm);
      updated++;
    });
    save(LS_VEHICLES, vehicles);
    let msg = `Kilometraje actualizado: ${updated} vehículo(s)`;
    if (noEncontrados.length) msg += `. Placas no encontradas en la flota: ${noEncontrados.join(", ")}`;
    toast(msg, noEncontrados.length ? "danger" : "ok");
    renderAll();
  };
  reader.readAsText(file);
}

/* ---------------- Vista: Inventario (herramientas y consumibles) ---------------- */
function renderInventarioView() {
  const bajoStock = (i) => Number(i.cantidad) <= Number(i.minimo);
  document.getElementById("inv-kpi-total").textContent = inventario.length;
  document.getElementById("inv-kpi-bajo").textContent = inventario.filter(bajoStock).length;
  document.getElementById("inv-kpi-herramientas").textContent = inventario.filter((i) => i.categoria === "herramienta").length;
  document.getElementById("inv-kpi-consumibles").textContent = inventario.filter((i) => i.categoria === "consumible").length;

  const q = (document.getElementById("search-inventario").value || "").toLowerCase();
  const catFiltro = document.getElementById("filter-inventario-categoria").value;
  const filtered = inventario
    .filter((i) => !q || i.nombre.toLowerCase().includes(q))
    .filter((i) => !catFiltro || i.categoria === catFiltro)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  document.getElementById("inventario-count-label").textContent = `${filtered.length} de ${inventario.length} ítem(s)`;

  const tbody = document.getElementById("inventario-tbody");
  if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Sin ítems para mostrar</td></tr>`; return; }
  tbody.innerHTML = filtered.map((i) => {
    const bajo = bajoStock(i);
    return `<tr data-id="${i.id}">
      <td>${escapeHtml(i.nombre)}</td>
      <td>${i.categoria === "herramienta" ? "Herramienta" : "Consumible"}</td>
      <td>${i.cantidad}</td>
      <td>${escapeHtml(i.unidad || "unidad")}</td>
      <td>${i.minimo}</td>
      <td><span class="badge ${bajo ? "danger" : "ok"}"><span class="badge-dot"></span>${bajo ? "Stock bajo" : "OK"}</span></td>
      <td class="row-actions">
        <button data-act="edit">Editar</button>
        <button data-act="delete">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    const item = inventario.find((i) => i.id === tr.dataset.id);
    tr.querySelector("[data-act='edit']").addEventListener("click", () => openInventarioModal(item));
    tr.querySelector("[data-act='delete']").addEventListener("click", () => confirmDeleteInventarioItem(item));
  });
}

function openInventarioModal(existing) {
  const item = existing || { id: uid("i"), nombre: "", categoria: "consumible", cantidad: 0, unidad: "unidad", minimo: 0 };
  openModal(`
    <h2>${existing ? "Editar ítem" : "Agregar ítem"}</h2>
    <div class="field"><label>Nombre</label><input id="f-inv-nombre" value="${escapeHtml(item.nombre)}" placeholder="Ej: Filtro de aceite"></div>
    <div class="row2">
      <div class="field"><label>Categoría</label>
        <select id="f-inv-categoria">
          <option value="consumible" ${item.categoria === "consumible" ? "selected" : ""}>Consumible</option>
          <option value="herramienta" ${item.categoria === "herramienta" ? "selected" : ""}>Herramienta</option>
        </select>
      </div>
      <div class="field"><label>Unidad</label><input id="f-inv-unidad" value="${escapeHtml(item.unidad || "unidad")}" placeholder="Ej: unidad, litro, juego"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Cantidad en stock</label><input type="number" id="f-inv-cantidad" value="${item.cantidad}"></div>
      <div class="field"><label>Mínimo (para alertar stock bajo)</label><input type="number" id="f-inv-minimo" value="${item.minimo}"></div>
    </div>
    <button class="btn primary block" id="f-inv-save">Guardar</button>
    ${existing ? `<button class="btn danger block" id="f-inv-delete" style="margin-top:10px;">Eliminar ítem</button>` : ""}
  `);
  document.getElementById("f-inv-save").addEventListener("click", () => {
    const nombre = document.getElementById("f-inv-nombre").value.trim();
    if (!nombre) { toast("El nombre es obligatorio", "danger"); return; }
    item.nombre = nombre;
    item.categoria = document.getElementById("f-inv-categoria").value;
    item.unidad = document.getElementById("f-inv-unidad").value.trim() || "unidad";
    item.cantidad = Number(document.getElementById("f-inv-cantidad").value) || 0;
    item.minimo = Number(document.getElementById("f-inv-minimo").value) || 0;
    if (!existing) inventario.push(item);
    save(LS_INVENTARIO, inventario);
    closeModal();
    toast(existing ? "Ítem actualizado" : "Ítem agregado", "ok");
    renderAll();
  });
  if (existing) {
    document.getElementById("f-inv-delete").addEventListener("click", () => confirmDeleteInventarioItem(item));
  }
}

function confirmDeleteInventarioItem(item) {
  openModal(`
    <h2>Eliminar ${escapeHtml(item.nombre)}</h2>
    <p>Esta acción no se puede deshacer.</p>
    <div class="row2">
      <button class="btn" id="cancel-delete-inv">Cancelar</button>
      <button class="btn danger" id="confirm-delete-inv">Sí, eliminar</button>
    </div>
  `);
  document.getElementById("cancel-delete-inv").addEventListener("click", closeModal);
  document.getElementById("confirm-delete-inv").addEventListener("click", () => {
    inventario = inventario.filter((i) => i.id !== item.id);
    save(LS_INVENTARIO, inventario);
    closeModal();
    toast("Ítem eliminado", "ok");
    renderAll();
  });
}

function exportInventarioCsv() {
  const headers = ["nombre", "categoria", "cantidad", "unidad", "minimo"];
  const rows = inventario.map((i) => [i.nombre, i.categoria, i.cantidad, i.unidad, i.minimo].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  downloadFile("inventario_" + todayIso() + ".csv", csv, "text/csv");
}

function importInventarioCsv(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let rows;
    try { rows = parseCsv(e.target.result); } catch (err) { toast("No se pudo leer el CSV", "danger"); return; }
    let added = 0, updated = 0;
    rows.forEach((row) => {
      if (!row.nombre) return;
      let item = inventario.find((i) => i.nombre.toLowerCase() === row.nombre.toLowerCase());
      if (!item) {
        item = { id: uid("i"), nombre: row.nombre, categoria: "consumible", cantidad: 0, unidad: "unidad", minimo: 0 };
        inventario.push(item);
        added++;
      } else { updated++; }
      item.categoria = (row.categoria === "herramienta" ? "herramienta" : "consumible");
      item.cantidad = row.cantidad !== "" && !isNaN(Number(row.cantidad)) ? Number(row.cantidad) : item.cantidad;
      item.unidad = row.unidad || item.unidad;
      item.minimo = row.minimo !== "" && !isNaN(Number(row.minimo)) ? Number(row.minimo) : item.minimo;
    });
    save(LS_INVENTARIO, inventario);
    toast(`Importación completa: ${added} agregados, ${updated} actualizados`, "ok");
    renderAll();
  };
  reader.readAsText(file);
}

/* ---------------- Vista: Preventivos ---------------- */
function renderPreventivosView() {
  const tbody = document.getElementById("preventivos-tbody");
  if (vehicles.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Sin vehículos registrados</td></tr>`; return; }
  const rows = vehicles.map((v) => {
    const a = computeVehicleAlerts(v);
    const tareas = a.next ? a.next.tareas.join(", ") : "—";
    const vencido = a.next ? a.next.vencido : false;
    const proximo = a.next ? a.next.proximo : false;
    const estado = vencido ? `<span class="status-text pendiente">Vencido</span>` : proximo ? `<span class="status-text en-curso">Próximo</span>` : `<span class="status-text completado">Programado</span>`;
    return `<tr data-id="${v.id}">
      <td>${escapeHtml(v.placa)}</td>
      <td>${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</td>
      <td>${fmtKm(v.km)} km</td>
      <td>${fmtKm(a.overallDue)} km</td>
      <td>${a.remainingOverall <= 0 ? "Vencido" : fmtKm(a.remainingOverall) + " km"}</td>
      <td title="${escapeHtml(tareas)}">${escapeHtml(tareas.length > 50 ? tareas.slice(0, 50) + "…" : tareas)}</td>
      <td>${estado}</td>
      <td><button data-act="ir" class="btn ghost">Ver / Agendar</button></td>
    </tr>`;
  });
  tbody.innerHTML = rows.join("");
  tbody.querySelectorAll("button[data-act='ir']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest("tr").dataset.id;
      currentVehicleId = id; save(LS_CURRENT, id);
      switchView("dashboard");
    });
  });
}

/* ---------------- Vista: Correctivos ---------------- */
function renderCorrectivosView() {
  const tbody = document.getElementById("correctivos-tbody");
  const list = records.filter((r) => r.tipo === "correctivo").sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  if (list.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Sin correctivos registrados</td></tr>`; return; }
  tbody.innerHTML = list.map((r) => {
    const vehicle = vehicles.find((v) => v.id === r.vehicleId) || { placa: "—" };
    const flag = r.prioridad === "alta" ? "alta" : r.prioridad === "baja" ? "baja" : "media";
    const tooltip = r.descripcion + (r.notas ? " — Notas: " + r.notas : "");
    return `<tr data-id="${r.id}">
      <td>${r.id}</td><td>${escapeHtml(vehicle.placa)}</td>
      <td title="${escapeHtml(tooltip)}">${escapeHtml(r.descripcion.length > 50 ? r.descripcion.slice(0, 50) + "…" : r.descripcion)}${r.notas ? ` <span class="note-flag" data-icon="doc" title="Tiene notas adicionales"></span>` : ""}</td>
      <td><span class="flag ${flag}"></span>${cap(r.prioridad)}</td>
      <td>${r.fecha}</td><td>${fmtMoney(r.costo)}</td>
      <td><span class="status-text ${r.estado}">${statusLabel(r.estado)}</span></td>
      <td class="row-actions">
        <button data-act="edit">Editar</button>
        ${r.estado !== "completado" ? `<button data-act="complete">Completar</button>` : ""}
        <button data-act="delete">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
  wireRowActions(tbody);
}

/* ---------------- Vista: Historial ---------------- */
function getFilteredHistorialRecords() {
  const q = (document.getElementById("search-historial").value || "").toLowerCase();
  const vehiculoFiltro = document.getElementById("historial-vehiculo").value;
  const tipoFiltro = document.getElementById("historial-tipo").value;
  const estadoFiltro = document.getElementById("historial-estado").value;
  return records
    .filter((r) => (!vehiculoFiltro || r.vehicleId === vehiculoFiltro))
    .filter((r) => (!tipoFiltro || r.tipo === tipoFiltro))
    .filter((r) => (!estadoFiltro || r.estado === estadoFiltro))
    .filter((r) => (!q || r.descripcion.toLowerCase().includes(q)))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

function renderHistorialView() {
  const selVehiculo = document.getElementById("historial-vehiculo");
  const previousSelection = selVehiculo.value;
  selVehiculo.innerHTML = `<option value="">Todos los vehículos</option>` + vehicles.map((v) => `<option value="${v.id}">${escapeHtml(v.placa)} — ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</option>`).join("");
  if (vehicles.find((v) => v.id === previousSelection)) selVehiculo.value = previousSelection;

  const filtered = getFilteredHistorialRecords();
  document.getElementById("historial-count-label").textContent = `${filtered.length} de ${records.length} registro(s)`;

  const tbody = document.getElementById("historial-tbody");
  if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Sin registros para este filtro</td></tr>`; return; }
  tbody.innerHTML = filtered.map((r) => rowHtml(r)).join("");
  wireRowActions(tbody);
}

/* ---------------- Historial: exportar como ficha técnica (PDF para imprimir / Excel) ---------------- */
function currentHistorialVehicle() {
  const id = document.getElementById("historial-vehiculo").value;
  return id ? vehicles.find((v) => v.id === id) : null;
}

function buildVehicleInfoRowsHtml(vehicle) {
  if (!vehicle) return "";
  const conductores = vehicle.conductores && vehicle.conductores.length ? vehicle.conductores.join(", ") : "Sin asignar";
  return `
    <tr><th>Placa</th><td>${escapeHtml(vehicle.placa)}</td><th>Marca</th><td>${escapeHtml(vehicle.marca)}</td><th>Modelo</th><td>${escapeHtml(vehicle.modelo)}</td></tr>
    <tr><th>Año</th><td>${vehicle.anio}</td><th>Configuración</th><td>${escapeHtml(vehicle.config)}</td><th>Normativa</th><td>${escapeHtml(vehicle.normativa)}</td></tr>
    <tr><th>VIN</th><td>${escapeHtml(vehicle.vin)}</td><th>Km actual</th><td>${fmtKm(vehicle.km)} km</td><th>Estado</th><td>${escapeHtml(vehicle.estado)}</td></tr>
    <tr><th>Conductor(es)</th><td colspan="5">${escapeHtml(conductores)}</td></tr>`;
}

function buildRecordsRowsHtml(filtered) {
  if (filtered.length === 0) return `<tr><td colspan="9">Sin registros para este filtro</td></tr>`;
  return filtered.map((r) => {
    const v = vehicles.find((x) => x.id === r.vehicleId) || { placa: "—" };
    return `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(v.placa)}</td><td>${r.tipo === "preventivo" ? "Preventivo" : "Correctivo"}</td><td>${escapeHtml(r.descripcion)}</td><td>${cap(r.prioridad)}</td><td>${escapeHtml(r.mecanico || "Sin asignar")}</td><td>${r.fecha}</td><td>${fmtMoney(r.costo)}</td><td>${statusLabel(r.estado)}</td></tr>`;
  }).join("");
}

function exportHistorialPdf() {
  const filtered = getFilteredHistorialRecords();
  const vehicle = currentHistorialVehicle();
  const win = window.open("", "_blank");
  if (!win) { toast("El navegador bloqueó la ventana emergente. Habilítala para exportar a PDF.", "danger"); return; }
  const titulo = vehicle ? "Ficha técnica y de mantenimiento — " + vehicle.placa : "Historial de mantenimientos — Todos los vehículos";
  win.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${escapeHtml(titulo)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:28px;}
      h1{font-size:19px;margin:0 0 2px;}
      .sub{color:#555;font-size:12px;margin-bottom:18px;}
      table{border-collapse:collapse;width:100%;margin-bottom:20px;}
      table.info th{background:#eef1f6;text-align:left;padding:6px 8px;font-size:11.5px;width:110px;border:1px solid #ddd;}
      table.info td{padding:6px 8px;font-size:11.5px;border:1px solid #ddd;}
      table.records th,table.records td{border:1px solid #ccc;padding:6px 8px;font-size:11px;text-align:left;}
      table.records th{background:#16233b;color:#fff;}
      table.records tr:nth-child(even){background:#f7f8fa;}
      .print-btn{padding:10px 18px;font-size:13px;cursor:pointer;margin-bottom:16px;}
      @media print{ .no-print{display:none;} body{padding:10px;} }
    </style></head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
      <h1>${escapeHtml(titulo)}</h1>
      <div class="sub">Fleet Maintenance · generado el ${escapeHtml(new Date().toLocaleString("es-CO"))} · ${filtered.length} registro(s)</div>
      ${vehicle ? `<table class="info">${buildVehicleInfoRowsHtml(vehicle)}</table>` : ""}
      <table class="records">
        <thead><tr><th>Orden</th><th>Vehículo</th><th>Tipo</th><th>Descripción</th><th>Prioridad</th><th>Mecánico</th><th>Fecha</th><th>Costo</th><th>Estado</th></tr></thead>
        <tbody>${buildRecordsRowsHtml(filtered)}</tbody>
      </table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function exportHistorialExcel() {
  const filtered = getFilteredHistorialRecords();
  const vehicle = currentHistorialVehicle();
  const titulo = vehicle ? "Ficha técnica y de mantenimiento — " + vehicle.placa : "Historial de mantenimientos — Todos los vehículos";
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8">
    <style>
      td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;}
      th{background:#16233b;color:#fff;}
      .info th{background:#eef1f6;color:#111;}
    </style></head><body>
    <h2>${escapeHtml(titulo)}</h2>
    <p>Fleet Maintenance · generado el ${escapeHtml(new Date().toLocaleString("es-CO"))} · ${filtered.length} registro(s)</p>
    ${vehicle ? `<table class="info">${buildVehicleInfoRowsHtml(vehicle)}</table><br>` : ""}
    <table>
      <tr><th>Orden</th><th>Vehículo</th><th>Tipo</th><th>Descripción</th><th>Prioridad</th><th>Mecánico</th><th>Fecha</th><th>Costo</th><th>Estado</th></tr>
      ${buildRecordsRowsHtml(filtered)}
    </table>
    </body></html>`;
  const filename = "historial_" + (vehicle ? vehicle.placa + "_" : "") + todayIso() + ".xls";
  downloadFile(filename, html, "application/vnd.ms-excel");
}

/* ---------------- Barra de distribución por estado (reutilizable) ---------------- */
function statusBarHtml(segments) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  const bar = segments.map((s) => `<div class="status-bar-seg" style="width:${(s.count / total) * 100}%;background:${s.color};" title="${escapeHtml(s.label)}: ${s.count}"></div>`).join("");
  const legend = segments.map((s) => `<span><span class="dot" style="background:${s.color};"></span>${escapeHtml(s.label)}: <b>${s.count}</b></span>`).join("");
  return `<div class="status-bar-wrap"><div class="status-bar">${bar}</div><div class="status-bar-legend">${legend}</div></div>`;
}

/* ---------------- Vista: KPIs ---------------- */
function renderKpisView() {
  const activeVehicles = vehicles.filter((v) => !v.oculto);
  const container = document.getElementById("kpis-content");

  const totalVeh = vehicles.length;
  const ocultosCount = vehicles.filter((v) => v.oculto).length;
  const operativos = activeVehicles.filter((v) => v.estado === "Operativo").length;
  const enTaller = activeVehicles.filter((v) => v.estado === "En Taller").length;
  const fueraServicio = activeVehicles.filter((v) => v.estado === "Fuera de Servicio").length;

  let prevVencido = 0, prevProximo = 0, prevAlDia = 0;
  activeVehicles.forEach((v) => {
    const a = computeVehicleAlerts(v);
    if (!a.next) return;
    if (a.next.vencido) prevVencido++;
    else if (a.next.proximo) prevProximo++;
    else prevAlDia++;
  });

  const totalPrevRecords = records.filter((r) => r.tipo === "preventivo").length;
  const totalCorrRecords = records.filter((r) => r.tipo === "correctivo").length;
  const corrPendiente = records.filter((r) => r.tipo === "correctivo" && r.estado === "pendiente").length;
  const corrEnCurso = records.filter((r) => r.tipo === "correctivo" && r.estado === "en-curso").length;
  const corrCompletado = records.filter((r) => r.tipo === "correctivo" && r.estado === "completado").length;
  const ratioTexto = totalCorrRecords === 0
    ? (totalPrevRecords === 0 ? "Sin órdenes registradas todavía" : "Sin correctivos registrados — toda la flota es preventiva")
    : `${totalPrevRecords} preventivo(s) por cada ${totalCorrRecords} correctivo(s) registrados`;

  let docVencido = 0, docProximo = 0, docVigente = 0, docSinRegistrar = 0;
  activeVehicles.forEach((v) => {
    computeDocAlerts(v).forEach((d) => {
      if (d.estado === "vencido") docVencido++;
      else if (d.estado === "proximo") docProximo++;
      else if (d.estado === "ok") docVigente++;
      else docSinRegistrar++;
    });
  });

  const sinConductor = activeVehicles.filter((v) => !v.conductores || v.conductores.length === 0).length;
  const kms = activeVehicles.map((v) => v.km || 0);
  const kmPromedio = kms.length ? Math.round(kms.reduce((a, b) => a + b, 0) / kms.length) : 0;
  const vehMasKm = activeVehicles.slice().sort((a, b) => (b.km || 0) - (a.km || 0))[0];
  const vehMenosKm = activeVehicles.slice().sort((a, b) => (a.km || 0) - (b.km || 0))[0];

  container.innerHTML = `
    <div class="kpis" style="margin-bottom:22px;">
      <div class="kpi blue"><div class="kpi-top"><span class="kpi-icon" data-icon="truck"></span><span class="label">Total de vehículos</span></div><div class="value">${totalVeh}</div></div>
      <div class="kpi blue"><div class="kpi-top"><span class="kpi-icon" data-icon="chart"></span><span class="label">Kilometraje promedio</span></div><div class="value">${fmtKm(kmPromedio)} km</div></div>
      <div class="kpi amber"><div class="kpi-top"><span class="kpi-icon" data-icon="user"></span><span class="label">Sin conductor asignado</span></div><div class="value">${sinConductor}</div></div>
      <div class="kpi red"><div class="kpi-top"><span class="kpi-icon" data-icon="shield"></span><span class="label">Documentos vencidos</span></div><div class="value">${docVencido}</div></div>
    </div>

    <div class="kpis-grid-2col">
      <div class="panel">
        <h3><span data-icon="truck"></span> Estado de la flota</h3>
        ${statusBarHtml([
          { label: "Operativo", count: operativos, color: "var(--ok)" },
          { label: "En Taller", count: enTaller, color: "var(--warn)" },
          { label: "Fuera de Servicio", count: fueraServicio, color: "var(--danger)" },
          { label: "Ocultos / archivados", count: ocultosCount, color: "var(--text-dim)" }
        ])}
      </div>

      <div class="panel">
        <h3><span data-icon="wrench"></span> Mantenimiento preventivo (por vehículo)</h3>
        ${statusBarHtml([
          { label: "Al día / programado", count: prevAlDia, color: "var(--ok)" },
          { label: "Próximo", count: prevProximo, color: "var(--warn)" },
          { label: "Vencido", count: prevVencido, color: "var(--danger)" }
        ])}
      </div>

      <div class="panel">
        <h3><span data-icon="alert"></span> Correctivos (histórico)</h3>
        ${statusBarHtml([
          { label: "Pendiente", count: corrPendiente, color: "var(--danger)" },
          { label: "En Curso", count: corrEnCurso, color: "var(--accent)" },
          { label: "Completado", count: corrCompletado, color: "var(--ok)" }
        ])}
        <div class="sub" style="color:var(--text-dim);font-size:12.5px;margin-top:4px;">${ratioTexto}</div>
      </div>

      <div class="panel">
        <h3><span data-icon="shield"></span> Documentos (SOAT y técnico-mecánica)</h3>
        ${statusBarHtml([
          { label: "Vigente", count: docVigente, color: "var(--ok)" },
          { label: "Próximo a vencer", count: docProximo, color: "var(--warn)" },
          { label: "Vencido", count: docVencido, color: "var(--danger)" },
          { label: "Sin registrar", count: docSinRegistrar, color: "var(--text-dim)" }
        ])}
      </div>
    </div>

    <div class="panel" style="margin-top:18px;">
      <h3><span data-icon="chart"></span> Kilometraje</h3>
      <div class="vehicle-info-grid" style="grid-template-columns:repeat(2,1fr);">
        <div><div class="li">Vehículo con más kilometraje</div><div class="val">${vehMasKm ? escapeHtml(vehMasKm.placa) + " — " + fmtKm(vehMasKm.km) + " km" : "—"}</div></div>
        <div><div class="li">Vehículo con menos kilometraje</div><div class="val">${vehMenosKm ? escapeHtml(vehMenosKm.placa) + " — " + fmtKm(vehMenosKm.km) + " km" : "—"}</div></div>
      </div>
    </div>
  `;
}

/* ---------------- Vista: Disponibilidad (para logística) ----------------
   No hay backend ni sincronización entre usuarios: se recalcula al instante con los
   datos que ya están cargados en este navegador, cada vez que entras a la vista.
------------------------------------------------------------------------------- */
function computeDisponibilidad(vehicle) {
  const bloqueos = [];
  const alertas = [];
  if (vehicle.estado !== "Operativo") bloqueos.push(`Estado: ${vehicle.estado}`);
  records
    .filter((r) => r.vehicleId === vehicle.id && r.tipo === "correctivo" && r.estado !== "completado")
    .forEach((r) => bloqueos.push(`Correctivo abierto: ${r.descripcion}`));
  computeDocAlerts(vehicle).forEach((d) => {
    if (d.estado === "vencido") bloqueos.push(`${d.label} vencido`);
    else if (d.estado === "proximo") alertas.push(`${d.label} vence en ${d.dias} día(s)`);
  });
  const prev = computeVehicleAlerts(vehicle);
  if (prev.next && prev.next.vencido) alertas.push(`Preventivo vencido (a los ${fmtKm(prev.next.dueKm)} km)`);
  else if (prev.next && prev.next.proximo) alertas.push(`Preventivo próximo (a los ${fmtKm(prev.next.dueKm)} km)`);

  const estado = bloqueos.length > 0 ? "no-disponible" : (alertas.length > 0 ? "alerta" : "disponible");
  return { estado, bloqueos, alertas };
}

function renderDisponibilidadView() {
  const activeVehicles = vehicles.filter((v) => !v.oculto);
  const computed = activeVehicles.map((v) => ({ vehicle: v, disp: computeDisponibilidad(v) }));

  document.getElementById("disp-kpi-operativos").textContent = activeVehicles.filter((v) => v.estado === "Operativo").length;
  document.getElementById("disp-kpi-no-operativos").textContent = activeVehicles.filter((v) => v.estado !== "Operativo").length;
  document.getElementById("disp-kpi-disponibles").textContent = computed.filter((c) => c.disp.estado === "disponible").length;
  document.getElementById("disp-kpi-alerta").textContent = computed.filter((c) => c.disp.estado === "alerta").length;
  document.getElementById("disp-kpi-no-disponibles").textContent = computed.filter((c) => c.disp.estado === "no-disponible").length;
  document.getElementById("disp-updated-label").textContent = "Actualizado ahora · " + new Date().toLocaleString("es-CO");

  const q = (document.getElementById("search-disponibilidad").value || "").toLowerCase();
  const orden = { "disponible": 0, "alerta": 1, "no-disponible": 2 };
  const filtered = computed
    .filter((c) => !q || (c.vehicle.placa + c.vehicle.marca + c.vehicle.modelo).toLowerCase().includes(q))
    .sort((a, b) => orden[a.disp.estado] - orden[b.disp.estado] || a.vehicle.placa.localeCompare(b.vehicle.placa));

  const tbody = document.getElementById("disponibilidad-tbody");
  if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Sin vehículos para mostrar</td></tr>`; return; }
  tbody.innerHTML = filtered.map(({ vehicle, disp }) => {
    const cls = disp.estado === "disponible" ? "ok" : disp.estado === "alerta" ? "warn" : "danger";
    const label = disp.estado === "disponible" ? "Disponible" : disp.estado === "alerta" ? "Disponible con alerta" : "No Disponible";
    const motivos = [...disp.bloqueos, ...disp.alertas];
    const motivosTexto = motivos.length ? motivos.join(" · ") : "Sin novedades";
    return `<tr data-id="${vehicle.id}">
      <td>${escapeHtml(vehicle.placa)}</td>
      <td>${escapeHtml(vehicle.marca)} ${escapeHtml(vehicle.modelo)}</td>
      <td>${vehicle.conductores && vehicle.conductores.length ? escapeHtml(vehicle.conductores.join(", ")) : "Sin asignar"}</td>
      <td>${fmtKm(vehicle.km)} km</td>
      <td><span class="badge ${cls}"><span class="badge-dot"></span>${label}</span></td>
      <td class="wrap-cell">${escapeHtml(motivosTexto)}</td>
      <td><button data-act="ir" class="btn ghost">Ver</button></td>
    </tr>`;
  }).join("");
  tbody.querySelectorAll("button[data-act='ir']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.closest("tr").dataset.id;
      currentVehicleId = id; save(LS_CURRENT, id);
      switchView("dashboard");
    });
  });
}

/* ---------------- Vista: Costos ---------------- */
function renderCostosView() {
  const mes = new Date().toISOString().slice(0, 7);
  const monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  document.getElementById("costos-mes-label").textContent = "Mes de " + monthNames[new Date().getMonth()] + " " + new Date().getFullYear();

  const inMonth = records.filter((r) => (r.fecha || "").slice(0, 7) === mes);
  const total = inMonth.reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const prev = inMonth.filter((r) => r.tipo === "preventivo").reduce((s, r) => s + (Number(r.costo) || 0), 0);
  const corr = inMonth.filter((r) => r.tipo === "correctivo").reduce((s, r) => s + (Number(r.costo) || 0), 0);
  document.getElementById("costos-total").textContent = fmtMoney(total);
  document.getElementById("costos-preventivo").textContent = fmtMoney(prev);
  document.getElementById("costos-correctivo").textContent = fmtMoney(corr);

  // costo por vehiculo -> barra horizontal, un solo hue secuencial (magnitud), etiquetas directas
  const byVehicle = {};
  inMonth.forEach((r) => { byVehicle[r.vehicleId] = (byVehicle[r.vehicleId] || 0) + (Number(r.costo) || 0); });
  const entries = Object.entries(byVehicle).map(([vid, cost]) => ({ vehicle: vehicles.find((v) => v.id === vid), cost })).filter((e) => e.vehicle).sort((a, b) => b.cost - a.cost);
  const maxCost = Math.max(1, ...entries.map((e) => e.cost));
  const chart = document.getElementById("cost-chart");
  if (entries.length === 0) {
    chart.innerHTML = `<div class="empty-state">Sin costos registrados este mes</div>`;
  } else {
    // rampa secuencial de un solo hue (azul), de más claro (menor costo) a más oscuro (mayor costo)
    const ramp = ["#8fbdfb", "#5c9bfa", "#2f7dfa", "#1a5fd6", "#123f96"];
    chart.innerHTML = entries.map((e) => {
      const pct = (e.cost / maxCost) * 100;
      // más oscuro = mayor magnitud de costo (rampa secuencial de un solo hue)
      const color = ramp[Math.min(ramp.length - 1, Math.floor((pct / 100) * (ramp.length - 1)))];
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text-dim);margin-bottom:4px;">
          <span style="color:var(--text);font-weight:600;">${escapeHtml(e.vehicle.placa)} — ${escapeHtml(e.vehicle.marca)} ${escapeHtml(e.vehicle.modelo)}</span>
          <span>${fmtMoney(e.cost)}</span>
        </div>
        <div style="height:14px;border-radius:6px;background:var(--panel-2);border:1px solid var(--border);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:6px;"></div>
        </div>
      </div>`;
    }).join("");
  }

  const tbody = document.getElementById("costos-tbody");
  if (inMonth.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Sin registros este mes</td></tr>`; return; }
  tbody.innerHTML = inMonth.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).map((r) => {
    const vehicle = vehicles.find((v) => v.id === r.vehicleId) || { placa: "—" };
    return `<tr><td>${r.id}</td><td>${escapeHtml(vehicle.placa)}</td><td><span class="pill ${r.tipo}">${r.tipo === "preventivo" ? "Preventivo" : "Correctivo"}</span></td><td>${escapeHtml(r.descripcion)}</td><td>${r.fecha}</td><td>${fmtMoney(r.costo)}</td></tr>`;
  }).join("");
}

/* ---------------- Modal genérico ---------------- */
function openModal(innerHtml) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay"><div class="modal">${innerHtml}</div></div>`;
  document.getElementById("modal-overlay").addEventListener("click", (e) => { if (e.target.id === "modal-overlay") closeModal(); });
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

/* ---------------- Configuración (plan de mantenimiento) ---------------- */
function openSettingsModal() {
  openModal(`
    <h2>Configuración del plan de mantenimiento</h2>
    <p class="sub" style="color:var(--text-dim);font-size:13px;">
      Define la ventana de aviso y la matriz de intervalos (en km) con sus tareas. El plan es cíclico:
      cada intervalo se repite indefinidamente sin importar el kilometraje del vehículo.
    </p>
    <div class="row2">
      <div class="field"><label>Ventana de alerta (km antes del vencimiento)</label><input type="number" id="cfg-ventana" value="${plan.ventanaAlertaKm}"></div>
      <div class="field"><label>Ventana de alerta de documentos (días antes del vencimiento)</label><input type="number" id="cfg-ventana-dias" value="${plan.ventanaAlertaDias || 30}"></div>
    </div>
    <div class="field"><label>Matriz de intervalos (JSON editable)</label><textarea id="cfg-json" style="min-height:220px;font-family:monospace;font-size:12px;">${escapeHtml(JSON.stringify(plan.intervalos, null, 2))}</textarea></div>
    <div class="row2">
      <button class="btn" id="cfg-restore">Restaurar por defecto</button>
      <button class="btn primary" id="cfg-save">Guardar cambios</button>
    </div>
  `);
  document.getElementById("cfg-restore").addEventListener("click", () => {
    plan = JSON.parse(JSON.stringify(DEFAULT_PLAN));
    save(LS_PLAN, plan);
    toast("Plan restaurado por defecto", "ok");
    closeModal(); renderAll();
  });
  document.getElementById("cfg-save").addEventListener("click", () => {
    const ventana = Number(document.getElementById("cfg-ventana").value) || 5000;
    let intervalos;
    try { intervalos = JSON.parse(document.getElementById("cfg-json").value); }
    catch (e) { toast("El JSON de intervalos no es válido", "danger"); return; }
    if (!Array.isArray(intervalos)) { toast("Los intervalos deben ser una lista", "danger"); return; }
    const ventanaDias = Number(document.getElementById("cfg-ventana-dias").value) || 30;
    plan = { ventanaAlertaKm: ventana, ventanaAlertaDias: ventanaDias, intervalos };
    save(LS_PLAN, plan);
    toast("Plan de mantenimiento actualizado", "ok");
    closeModal(); renderAll();
  });
}

/* ---------------- Reset total ---------------- */
function resetAllData() {
  openModal(`
    <h2>Vaciar todos los datos</h2>
    <p>Esto elimina vehículos, mantenimientos y configuración guardados en este navegador. Esta acción no se puede deshacer.</p>
    <div class="row2">
      <button class="btn" id="cancel-reset">Cancelar</button>
      <button class="btn danger" id="confirm-reset">Sí, vaciar todo</button>
    </div>
  `);
  document.getElementById("cancel-reset").addEventListener("click", closeModal);
  document.getElementById("confirm-reset").addEventListener("click", () => {
    [LS_VEHICLES, LS_RECORDS, LS_PLAN, LS_CURRENT, LS_ORDER_SEQ].forEach((k) => localStorage.removeItem(k));
    loadState();
    closeModal();
    toast("Datos reiniciados a los valores de ejemplo", "ok");
    switchView("dashboard");
  });
}

/* ---------------- Render maestro ---------------- */
function renderAll() {
  renderKpis();
  renderVehicleSelector();
  if (currentView === "dashboard") {
    renderAlertasImportantes();
    renderVehicleCard();
    renderPreventivoPanel();
    renderCorrectivoPanel();
    renderRecordsTable();
  } else if (currentView === "vehiculos") {
    renderVehiculosView();
  } else if (currentView === "inventario") {
    renderInventarioView();
  } else if (currentView === "preventivos") {
    renderPreventivosView();
  } else if (currentView === "correctivos") {
    renderCorrectivosView();
  } else if (currentView === "historial") {
    renderHistorialView();
  } else if (currentView === "kpis") {
    renderKpisView();
  } else if (currentView === "disponibilidad") {
    renderDisponibilidadView();
  } else if (currentView === "costos") {
    renderCostosView();
  }
  applyIcons();
}

/* ---------------- Wiring general de eventos ---------------- */
function wireEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach((n) => n.addEventListener("click", () => { switchView(n.dataset.view); setMobileNav(false); }));
  document.querySelectorAll(".nav-group-toggle").forEach((t) => t.addEventListener("click", () => toggleNavGroup(t.dataset.group)));
  document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);
  document.getElementById("mobile-nav-toggle").addEventListener("click", () => setMobileNav(!document.body.classList.contains("mobile-nav-open")));
  document.getElementById("sidebar-backdrop").addEventListener("click", () => setMobileNav(false));
  document.getElementById("btn-theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("nav-reset").addEventListener("click", resetAllData);
  document.getElementById("btn-settings").addEventListener("click", openSettingsModal);
  document.getElementById("btn-notifications").addEventListener("click", () => switchView("preventivos"));

  document.getElementById("select-current-vehicle").addEventListener("change", (e) => {
    currentVehicleId = e.target.value; save(LS_CURRENT, currentVehicleId); renderAll();
  });
  document.getElementById("search-input").addEventListener("input", () => renderAll());
  document.getElementById("filter-estado").addEventListener("change", () => renderAll());

  document.getElementById("btn-add-vehiculo").addEventListener("click", () => openAddVehicleModal(null));
  document.getElementById("search-vehiculos").addEventListener("input", () => renderVehiculosView());
  document.getElementById("chk-show-hidden").addEventListener("change", () => renderVehiculosView());
  document.getElementById("btn-import-csv").addEventListener("click", () => document.getElementById("csv-file-input").click());
  document.getElementById("csv-file-input").addEventListener("change", (e) => { if (e.target.files[0]) importCsvFile(e.target.files[0]); e.target.value = ""; });
  document.getElementById("btn-export-csv").addEventListener("click", exportCsv);
  document.getElementById("btn-plantilla-csv").addEventListener("click", () => {
    const csv = "placa,marca,modelo,anio,configuracion,vin,normativa,km_actual,estado,conductores,numero_motor,combustible,capacidad_carga,vencimiento_soat,vencimiento_tecnomecanica\nFVZ-002,UD Trucks,FVZ,2026,Camion Rigido 6x2,VIN_EJEMPLO,Euro VI,0,Operativo,Juan Perez;Carlos Gomez,MOT-EJEMPLO-0002,Diesel,8.500 kg,2026-12-01,2027-03-01";
    downloadFile("plantilla_vehiculos.csv", csv, "text/csv");
  });
  document.getElementById("btn-plantilla-km").addEventListener("click", exportKmTemplate);
  document.getElementById("btn-update-km-csv").addEventListener("click", () => document.getElementById("km-csv-file-input").click());
  document.getElementById("km-csv-file-input").addEventListener("change", (e) => { if (e.target.files[0]) importKmCsvFile(e.target.files[0]); e.target.value = ""; });

  document.getElementById("btn-add-inventario").addEventListener("click", () => openInventarioModal(null));
  document.getElementById("search-inventario").addEventListener("input", () => renderInventarioView());
  document.getElementById("filter-inventario-categoria").addEventListener("change", () => renderInventarioView());
  document.getElementById("btn-export-inventario-csv").addEventListener("click", exportInventarioCsv);
  document.getElementById("btn-import-inventario-csv").addEventListener("click", () => document.getElementById("inventario-csv-file-input").click());
  document.getElementById("inventario-csv-file-input").addEventListener("change", (e) => { if (e.target.files[0]) importInventarioCsv(e.target.files[0]); e.target.value = ""; });
  document.getElementById("btn-plantilla-inventario-csv").addEventListener("click", () => {
    const csv = "nombre,categoria,cantidad,unidad,minimo\nFiltro de aceite,consumible,12,unidad,5\nJuego de llaves mixtas,herramienta,2,juego,1";
    downloadFile("plantilla_inventario.csv", csv, "text/csv");
  });

  document.getElementById("btn-nuevo-correctivo-modal").addEventListener("click", () => {
    switchView("dashboard");
    document.getElementById("corr-descripcion").focus();
  });

  document.getElementById("search-historial").addEventListener("input", () => renderHistorialView());
  document.getElementById("historial-vehiculo").addEventListener("change", () => renderHistorialView());
  document.getElementById("historial-tipo").addEventListener("change", () => renderHistorialView());
  document.getElementById("historial-estado").addEventListener("change", () => renderHistorialView());
  document.getElementById("btn-historial-pdf").addEventListener("click", exportHistorialPdf);
  document.getElementById("btn-historial-excel").addEventListener("click", exportHistorialExcel);

  document.getElementById("search-disponibilidad").addEventListener("input", () => renderDisponibilidadView());
}

/* ---------------- Sidebar plegable ---------------- */
function toggleSidebar() {
  const collapsed = document.querySelector(".app").classList.toggle("sidebar-collapsed");
  save(LS_SIDEBAR_COLLAPSED, collapsed);
  document.getElementById("sidebar-toggle").title = collapsed ? "Expandir menú" : "Colapsar menú";
}

function applySidebarState() {
  const collapsed = load(LS_SIDEBAR_COLLAPSED, false);
  document.querySelector(".app").classList.toggle("sidebar-collapsed", collapsed);
  document.getElementById("sidebar-toggle").title = collapsed ? "Expandir menú" : "Colapsar menú";
}

/* ---------------- Menú móvil (hamburguesa) ---------------- */
function setMobileNav(open) {
  document.body.classList.toggle("mobile-nav-open", open);
}

/* ---------------- Tema claro / oscuro ---------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.querySelector("#btn-theme-toggle [data-icon]");
  if (icon) { icon.dataset.icon = theme === "light" ? "sun" : "moon"; applyIcons(); }
  document.getElementById("btn-theme-toggle").title = theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  save(LS_THEME, next);
  applyTheme(next);
}

/* ---------------- Arranque ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  wireEvents();
  applySidebarState();
  applyTheme(load(LS_THEME, "dark"));
  switchView("dashboard");
});
