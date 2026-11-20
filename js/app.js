/* Calculadora de precios RZ · pantalla (la fórmula está en calculo.js).
   La configuración y el historial se guardan en el teléfono (localStorage). */
"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const CLAVE_CONFIG = "calcRZ.config", CLAVE_HIST = "calcRZ.historial", MAX_HIST = 10;
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const copia = o => JSON.parse(JSON.stringify(o));

  // ---------- Formatos ----------
  const fmt = n => { const v = Math.round(Number(n) || 0); return (v < 0 ? "-" : "") + "₡" + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
  const pct = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n) + " %";
  const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function fechaHora(iso) {
    const d = new Date(iso), h = d.getHours();
    return `${String(d.getDate()).padStart(2, "0")}/${MESES[d.getMonth()]}/${d.getFullYear()} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
  }

  // ---------- Mensajes ----------
  let tToast = null;
  function toast(texto, aviso = false) {
    const t = $("toast"); t.textContent = (aviso ? "⚠ " : "✓ ") + texto;
    t.classList.toggle("w", aviso); t.classList.add("on");
    clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove("on"), aviso ? 4000 : 2500);
  }

  // ---------- Almacenamiento en el teléfono ----------
  function leer(clave, porDefecto) {
    try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; }
    catch { toast("No se pudo guardar en este teléfono", true); return false; }
  }

  let config = leer(CLAVE_CONFIG, null);
  if (!config || Calculo.validarConfig(config).length) config = copia(Calculo.CONFIG_INICIAL);
  let historial = leer(CLAVE_HIST, []);
  if (!Array.isArray(historial)) historial = [];

  // ---------- Estado del cálculo ----------
  const nuevaEntrada = () => ({ cliente: "B", rango: null, trabajos: [], repuestos: [{ descripcion: "", costo: "" }], traslado: config.traslado });
  let entrada = nuevaEntrada();          // entrada.trabajos = nombres seleccionados

  const trabajosElegidos = () => entrada.trabajos.map(n => config.trabajos.find(t => t.nombre === n)).filter(Boolean);
  const calcular = () => Calculo.calcular(config, { ...entrada, trabajos: trabajosElegidos() });

  // ======================= Pantalla Calculadora =======================
  function pintarOpciones() {
    [...$("cCliente").children].forEach(b => b.classList.toggle("on", b.dataset.v === entrada.cliente));
    $("cRango").innerHTML = config.rangos.map((r, i) => `<button class="op lista${entrada.rango === i ? " on" : ""}" data-i="${i}">
      <b>${i + 1} · ${esc(r.nombre)}</b><small>${pct(r.ajuste)} mano de obra</small></button>`).join("");
    $("cTrabajos").innerHTML = config.trabajos.length
      ? config.trabajos.map(t => { const on = entrada.trabajos.includes(t.nombre);
          return `<div class="trab${on ? " on" : ""}" data-n="${esc(t.nombre)}" role="checkbox" aria-checked="${on}" tabindex="0">
            <span class="ck">${on ? "✓" : ""}</span><span class="n">${esc(t.nombre)}</span><span class="money">${fmt(t.precio)}</span></div>`; }).join("")
      : '<div class="hint">Todavía no hay trabajos. Agrégalos en Configuración.</div>';
  }

  function pintarRepuestos() {
    $("cRepuestos").innerHTML = entrada.repuestos.map((r, i) => `<div class="rep">
      <input data-i="${i}" data-c="descripcion" placeholder="Descripción (opcional)" value="${esc(r.descripcion)}">
      <input data-i="${i}" data-c="costo" type="number" inputmode="numeric" min="0" placeholder="₡ costo" class="money" value="${esc(r.costo)}">
      <button class="quitar" data-quitar="${i}" title="Quitar">✕</button></div>`).join("");
  }

  function pintarResultado() {
    const r = calcular();
    const desc = `${pct(r.ajusteRango)} por equipo · ${pct(r.ajusteCliente)} cliente ${entrada.cliente}`;
    $("cSumaRep").textContent = `Costo real: ${fmt(r.costoRepuestos)}`;
    $("cRes").innerHTML = `<h2>Resultado</h2>
      ${r.faltaRango ? '<div class="aviso">Elige el valor del equipo para calcular la mano de obra.</div>' : ""}
      <div class="l"><span>Repuestos <small>(${fmt(r.costoRepuestos)} + ${r.margen} %)</small></span><b>${fmt(r.repuestos)}</b></div>
      <div class="l"><span>Mano de obra <small>(${fmt(r.baseManoObra)} ${desc})</small></span><b>${fmt(r.manoObra)}</b></div>
      <div class="l"><span>Traslado</span><b>${fmt(r.traslado)}</b></div>
      ${r.redondeo ? `<div class="l"><span>Redondeo</span><span>${r.redondeo > 0 ? "+" : ""}${fmt(r.redondeo)}</span></div>` : ""}
      <div class="tot"><span>Total <small style="color:var(--gray)">IVA incluido</small></span><b>${fmt(r.total)}</b></div>`;
    $("bTotal").textContent = fmt(r.total);
    return r;
  }

  function pintarCalculadora() {
    pintarOpciones(); pintarRepuestos();
    $("cTraslado").value = entrada.traslado;
    pintarResultado();
  }

  $("cCliente").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return; entrada.cliente = b.dataset.v; pintarOpciones(); pintarResultado(); });
  $("cRango").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; entrada.rango = Number(b.dataset.i); pintarOpciones(); pintarResultado(); });
  function alternarTrabajo(el) {
    const n = el.dataset.n;
    entrada.trabajos = entrada.trabajos.includes(n) ? entrada.trabajos.filter(x => x !== n) : [...entrada.trabajos, n];
    pintarOpciones(); pintarResultado();
  }
  $("cTrabajos").addEventListener("click", e => { const t = e.target.closest(".trab"); if (t) alternarTrabajo(t); });
  $("cTrabajos").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".trab")) { e.preventDefault(); alternarTrabajo(e.target); } });
  $("cRepuestos").addEventListener("input", e => {
    const i = e.target.dataset.i; if (i === undefined) return;
    entrada.repuestos[i][e.target.dataset.c] = e.target.value; pintarResultado();
  });
  $("cRepuestos").addEventListener("click", e => {
    const q = e.target.dataset.quitar; if (q === undefined) return;
    entrada.repuestos.splice(Number(q), 1);
    if (!entrada.repuestos.length) entrada.repuestos.push({ descripcion: "", costo: "" });
    pintarRepuestos(); pintarResultado();
  });
  $("cAddRep").addEventListener("click", () => {
    entrada.repuestos.push({ descripcion: "", costo: "" }); pintarRepuestos();
    $("cRepuestos").lastElementChild.querySelector('[data-c="costo"]').focus();
  });
  $("cTraslado").addEventListener("input", () => { entrada.traslado = $("cTraslado").value; pintarResultado(); });

  $("cLimpiar").addEventListener("click", () => { entrada = nuevaEntrada(); $("cNota").value = ""; pintarCalculadora(); window.scrollTo(0, 0); });

  $("cGuardar").addEventListener("click", () => {
    const r = calcular();
    if (r.faltaRango) { toast("Elige el valor del equipo antes de guardar", true); return; }
    if (!r.total) { toast("No hay nada que guardar todavía", true); return; }
    historial.unshift({
      fecha: new Date().toISOString(), nota: $("cNota").value.trim(),
      entrada: { cliente: entrada.cliente, rango: entrada.rango, trabajos: trabajosElegidos(),
                 repuestos: entrada.repuestos.filter(x => x.descripcion || Number(x.costo)), traslado: Number(entrada.traslado) || 0 },
      rangoNombre: entrada.rango === null ? "—" : config.rangos[entrada.rango].nombre,
      resultado: r,
    });
    historial = historial.slice(0, MAX_HIST);               // el más antiguo se borra solo
    if (escribir(CLAVE_HIST, historial)) toast(`Cálculo guardado · ${fmt(r.total)}`);
  });

  // ======================= Pantalla Historial =======================
  function pintarHistorial() {
    $("hVaciar").style.display = historial.length ? "" : "none";
    $("hLista").innerHTML = historial.length ? historial.map((h, i) => {
      const r = h.resultado, e = h.entrada;
      return `<div class="hist" data-i="${i}">
        <div class="cab"><div><b>${esc(h.nota || "Sin nota")}</b><br><small style="color:var(--gray)">${fechaHora(h.fecha)} · Cliente ${e.cliente} · Rango ${e.rango === null ? "—" : e.rango + 1}</small></div>
          <b>${fmt(r.total)}</b></div>
        <div class="det res">
          ${e.trabajos.length ? `<div class="hint" style="margin:0 0 6px">${e.trabajos.map(t => esc(t.nombre)).join(" + ")}</div>` : ""}
          <div class="l"><span>Repuestos <small>(${fmt(r.costoRepuestos)} + ${r.margen} %)</small></span><b>${fmt(r.repuestos)}</b></div>
          <div class="l"><span>Mano de obra <small>(${fmt(r.baseManoObra)} ${pct(r.ajusteRango)} · ${pct(r.ajusteCliente)})</small></span><b>${fmt(r.manoObra)}</b></div>
          <div class="l"><span>Traslado</span><b>${fmt(r.traslado)}</b></div>
          ${r.redondeo ? `<div class="l"><span>Redondeo</span><span>${r.redondeo > 0 ? "+" : ""}${fmt(r.redondeo)}</span></div>` : ""}
          <div class="tot"><span>Total</span><b>${fmt(r.total)}</b></div>
          <button class="btn" data-usar="${i}" style="width:100%;margin-top:10px">Usar de nuevo</button>
        </div></div>`;
    }).join("") : '<div class="card hint">Todavía no hay cálculos guardados. Usa el botón «Guardar» de la calculadora.</div>';
  }
  $("hLista").addEventListener("click", e => {
    const u = e.target.dataset.usar;
    if (u !== undefined) { usarDeNuevo(historial[Number(u)]); return; }
    const h = e.target.closest(".hist"); if (h) h.classList.toggle("abierto");
  });
  function usarDeNuevo(h) {
    const e = h.entrada;
    const faltan = e.trabajos.filter(t => !config.trabajos.some(c => c.nombre === t.nombre)).map(t => t.nombre);
    entrada = { cliente: e.cliente, rango: e.rango, trabajos: e.trabajos.map(t => t.nombre).filter(n => !faltan.includes(n)),
                repuestos: e.repuestos.length ? copia(e.repuestos) : [{ descripcion: "", costo: "" }], traslado: e.traslado };
    $("cNota").value = h.nota || "";
    ir("pCalc"); pintarCalculadora();
    toast(faltan.length ? `Ya no existe en la configuración: ${faltan.join(", ")}` : "Valores cargados · el total usa la configuración actual", !!faltan.length);
  }
  $("hVaciar").addEventListener("click", () => { $("hConfirmar").style.display = "block"; });
  $("hNo").addEventListener("click", () => { $("hConfirmar").style.display = "none"; });
  $("hSi").addEventListener("click", () => { historial = []; escribir(CLAVE_HIST, historial); $("hConfirmar").style.display = "none"; pintarHistorial(); toast("Historial vacío"); });

  // ======================= Pantalla Configuración =======================
  const campoPct = (grupo, clave, valor) => `<div><label>Cliente ${clave}</label><div class="pct"><input type="number" inputmode="decimal" step="any" data-g="${grupo}" data-k="${clave}" value="${valor}"></div></div>`;
  function pintarConfig() {
    $("gMargen").innerHTML = ["A", "B", "C"].map(k => campoPct("margenRepuestos", k, config.margenRepuestos[k])).join("");
    $("gAjCli").innerHTML = ["A", "B", "C"].map(k => campoPct("ajusteManoObraCliente", k, config.ajusteManoObraCliente[k])).join("");
    $("gRangos").innerHTML = config.rangos.map((r, i) => `<div class="cfgrango"><span>${i + 1} · ${esc(r.nombre)}</span>
      <div class="pct"><input type="number" inputmode="decimal" step="any" data-rango="${i}" value="${r.ajuste}"></div></div>`).join("");
    $("gTrabajos").innerHTML = config.trabajos.map((t, i) => `<div class="cfgtrab">
      <input data-t="${i}" data-c="nombre" value="${esc(t.nombre)}" placeholder="Nombre del trabajo">
      <input data-t="${i}" data-c="precio" type="number" inputmode="numeric" min="0" class="money" value="${t.precio}">
      <button class="mini" data-mover="${i}" data-d="-1" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
      <button class="mini" data-mover="${i}" data-d="1" title="Bajar" ${i === config.trabajos.length - 1 ? "disabled" : ""}>↓</button>
      <button class="mini" data-borrar="${i}" title="Borrar" style="color:var(--warn)">✕</button></div>`).join("")
      || '<div class="hint">Sin trabajos. Agrega los que más haces.</div>';
    $("gTraslado").value = config.traslado;
    $("gRedondeo").value = String(config.redondeo);
  }

  function guardarConfig(mensaje = true) {
    const problemas = Calculo.validarConfig(config);
    if (problemas.length) { $("gEstado").textContent = "⚠ Revisa: " + problemas.join(", ") + ". No se guardó."; $("gEstado").style.color = "var(--warn)"; return false; }
    if (escribir(CLAVE_CONFIG, config)) {
      $("gEstado").textContent = "✓ Guardado en este teléfono."; $("gEstado").style.color = "var(--ok)";
      if (mensaje) clearTimeout(guardarConfig.t), (guardarConfig.t = setTimeout(() => { $("gEstado").textContent = "Los cambios se guardan solos en este teléfono."; $("gEstado").style.color = ""; }, 2500));
    }
    return true;
  }

  $("pCfg").addEventListener("input", e => {
    const el = e.target, n = el.value === "" ? NaN : Number(el.value);
    if (el.dataset.g) config[el.dataset.g][el.dataset.k] = n;
    else if (el.dataset.rango !== undefined) config.rangos[el.dataset.rango].ajuste = n;
    else if (el.dataset.t !== undefined) {
      const t = config.trabajos[el.dataset.t];
      if (el.dataset.c === "nombre") {
        const nuevo = el.value.trim();
        entrada.trabajos = entrada.trabajos.map(x => x === t.nombre ? nuevo : x);      // conserva la selección al renombrar
        t.nombre = nuevo;
      } else t.precio = n;
    } else if (el.id === "gTraslado") { config.traslado = n; }
    else return;
    guardarConfig();
  });
  $("gRedondeo").addEventListener("change", () => { config.redondeo = Number($("gRedondeo").value); guardarConfig(); });
  $("gTrabajos").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.borrar !== undefined) {
      const [t] = config.trabajos.splice(Number(b.dataset.borrar), 1);
      entrada.trabajos = entrada.trabajos.filter(x => x !== t.nombre);
    } else if (b.dataset.mover !== undefined) {
      const i = Number(b.dataset.mover), j = i + Number(b.dataset.d);
      [config.trabajos[i], config.trabajos[j]] = [config.trabajos[j], config.trabajos[i]];
    }
    guardarConfig(); pintarConfig();
  });
  $("gAddTrab").addEventListener("click", () => {
    let nombre = "Trabajo nuevo", k = 2;
    while (config.trabajos.some(t => t.nombre === nombre)) nombre = `Trabajo nuevo ${k++}`;
    config.trabajos.push({ nombre, precio: 0 }); guardarConfig(); pintarConfig();
    const ult = $("gTrabajos").lastElementChild.querySelector("input"); ult.focus(); ult.select();
  });
  $("gRestablecer").addEventListener("click", () => { $("gConfirmar").style.display = "block"; });
  $("gNo").addEventListener("click", () => { $("gConfirmar").style.display = "none"; });
  $("gSi").addEventListener("click", () => {
    config = copia(Calculo.CONFIG_INICIAL); guardarConfig(); $("gConfirmar").style.display = "none";
    entrada.trabajos = entrada.trabajos.filter(n => config.trabajos.some(t => t.nombre === n));
    pintarConfig(); toast("Configuración restablecida");
  });

  // ---------- Exportar / importar la configuración ----------
  $("gExportar").addEventListener("click", async () => {
    const hoy = new Date(), dd = n => String(n).padStart(2, "0");
    const nombre = `calculadora-rz-config-${hoy.getFullYear()}-${dd(hoy.getMonth() + 1)}-${dd(hoy.getDate())}.json`;
    const texto = JSON.stringify({ app: "Calculadora RZ", formato: 1, exportado: hoy.toISOString(), config }, null, 2);
    const archivo = new File([texto], nombre, { type: "application/json" });
    // En el teléfono: menú «Compartir» (Drive, WhatsApp, correo…). Si no se puede, se descarga.
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], title: "Configuración de la Calculadora RZ" }); toast("Configuración exportada"); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(archivo); a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Configuración exportada · ${nombre}`);
  });

  let importada = null;
  $("gImportar").addEventListener("click", () => $("gArchivo").click());
  $("gArchivo").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const datos = JSON.parse(await f.text());
      const c = datos && datos.config ? datos.config : datos;
      const problemas = Calculo.validarConfig(c);
      if (problemas.length) { toast("El archivo no es una configuración válida: " + problemas.join(", "), true); return; }
      importada = c;
      $("gImpTxt").textContent = `Se reemplaza la configuración actual por la del archivo «${f.name}» (${c.trabajos.length} trabajos).`;
      $("gImpConfirmar").style.display = "block";
    } catch { toast("No se pudo leer el archivo. Debe ser el .json exportado por la calculadora.", true); }
  });
  $("gImpNo").addEventListener("click", () => { importada = null; $("gImpConfirmar").style.display = "none"; });
  $("gImpSi").addEventListener("click", () => {
    config = copia(importada); importada = null; $("gImpConfirmar").style.display = "none";
    entrada.trabajos = entrada.trabajos.filter(n => config.trabajos.some(t => t.nombre === n));
    entrada.traslado = config.traslado;
    if (guardarConfig()) { pintarConfig(); toast("Configuración importada"); }
  });

  // ======================= Navegación =======================
  function ir(id) {
    document.querySelectorAll(".pantalla").forEach(p => p.classList.toggle("on", p.id === id));
    document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.p === id));
    if (id === "pCalc") pintarCalculadora();
    if (id === "pHist") pintarHistorial();
    if (id === "pCfg") pintarConfig();
    window.scrollTo(0, 0);
  }
  document.querySelector("nav").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) ir(b.dataset.p); });

  pintarCalculadora();
  window.CalcRZ = { ir };            // para las pruebas automáticas

  // Funcionamiento sin internet (solo cuando se abre desde la dirección publicada, no como archivo)
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
