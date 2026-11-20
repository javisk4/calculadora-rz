/* Calculadora de precios RZ · fórmula (sin pantalla: se usa en el navegador y en las pruebas).

   Todos los montos con IVA incluido.
     Repuestos    = costo real × (1 + margen del tipo de cliente)
     Mano de obra = Σ precio fijo de cada trabajo × (1 + ajuste del rango) × (1 + ajuste del cliente)
     Traslado     = monto del traslado
     Total        = suma redondeada al paso configurado (₡500 por defecto; en un empate, sube)

   Los porcentajes son números enteros o con decimales (15 = 15 %). Para evitar errores de coma
   flotante (1,05 × 18 750), se calcula con enteros: costo × (100 + m) / 100. */
"use strict";

(function (raiz) {
  // Valores iniciales NEUTROS: el código se publica en un repositorio público, así que no lleva los
  // márgenes ni precios reales del negocio. Los reales se cargan en el teléfono (Configuración o
  // «Importar configuración»).
  const CONFIG_INICIAL = {
    margenRepuestos: { A: 0, B: 0, C: 0 },            // %
    ajusteManoObraCliente: { A: 0, B: 0, C: 0 },      // %
    rangos: [                                          // ajuste de la mano de obra por valor del equipo
      { nombre: "Hasta ₡200 000", ajuste: 0 },
      { nombre: "₡200 000 a ₡400 000", ajuste: 0 },
      { nombre: "₡400 000 a ₡600 000", ajuste: 0 },
      { nombre: "₡600 000 a ₡1 000 000", ajuste: 0 },
      { nombre: "Más de ₡1 000 000", ajuste: 0 },
    ],
    trabajos: [                                        // nombres de ejemplo; el precio se pone en el teléfono
      { nombre: "Diagnóstico", precio: 0 },
      { nombre: "Mantenimiento preventivo", precio: 0 },
      { nombre: "Cambio de relé o protector", precio: 0 },
      { nombre: "Carga de gas", precio: 0 },
      { nombre: "Cambio de compresor", precio: 0 },
    ],
    traslado: 0,
    redondeo: 500,                                     // 0 = sin redondeo; 100, 500 o 1000
  };

  /** Redondeo comercial al entero (0,5 sube) para montos positivos o negativos. */
  function redondear(x) {
    return Math.sign(x) * Math.round(Math.abs(x) + 1e-9);
  }

  /** Total redondeado al múltiplo más cercano de `paso` (empate: sube). */
  function redondearA(x, paso) {
    if (!paso) return redondear(x);
    return Math.floor(x / paso + 0.5) * paso;
  }

  /** Porcentaje a entero de centésimas para operar sin coma flotante: 15 -> 11500 (= 1,15 × 10 000). */
  const factor = pct => Math.round((100 + Number(pct || 0)) * 100);

  /**
   * entrada = { cliente: "A"|"B"|"C", rango: 0..4 | null, trabajos: [{nombre, precio}],
   *             repuestos: [{descripcion, costo}], traslado: número }
   * Devuelve el desglose y el total. Si hay trabajos sin rango elegido, `faltaRango` = true.
   */
  function calcular(config, entrada) {
    const cliente = entrada.cliente || "B";
    const costo = (entrada.repuestos || []).reduce((s, r) => s + (Number(r.costo) || 0), 0);
    const margen = config.margenRepuestos[cliente] ?? 0;
    const repuestos = redondear(costo * factor(margen) / 10000);

    const trabajos = entrada.trabajos || [];
    const base = trabajos.reduce((s, t) => s + (Number(t.precio) || 0), 0);
    const rango = entrada.rango === null || entrada.rango === undefined ? null : config.rangos[entrada.rango];
    const ajusteRango = rango ? rango.ajuste : 0;
    const ajusteCliente = config.ajusteManoObraCliente[cliente] ?? 0;
    const manoObra = redondear(base * factor(ajusteRango) * factor(ajusteCliente) / 1e8);

    const traslado = redondear(Number(entrada.traslado) || 0);
    const suma = repuestos + manoObra + traslado;
    const total = redondearA(suma, Number(config.redondeo) || 0);
    return {
      costoRepuestos: costo, margen, repuestos,
      baseManoObra: base, ajusteRango, ajusteCliente, manoObra,
      traslado, suma, redondeo: total - suma, total,
      faltaRango: trabajos.length > 0 && !rango,
    };
  }

  /** Revisa una configuración importada o editada; devuelve la lista de problemas (vacía si está bien). */
  function validarConfig(c) {
    const p = [];
    const num = v => typeof v === "number" && isFinite(v);
    for (const k of ["A", "B", "C"]) {
      if (!num(c?.margenRepuestos?.[k])) p.push(`Margen de repuestos del cliente ${k}`);
      if (!num(c?.ajusteManoObraCliente?.[k])) p.push(`Ajuste de mano de obra del cliente ${k}`);
    }
    if (!Array.isArray(c?.rangos) || c.rangos.length !== 5 || !c.rangos.every(r => num(r.ajuste) && r.nombre))
      p.push("Los 5 rangos del valor del equipo");
    if (!Array.isArray(c?.trabajos) || !c.trabajos.every(t => t.nombre && num(t.precio) && t.precio >= 0))
      p.push("La lista de trabajos");
    if (!num(c?.traslado) || c.traslado < 0) p.push("El traslado");
    if (![0, 100, 500, 1000].includes(c?.redondeo)) p.push("El redondeo");
    return p;
  }

  const api = { CONFIG_INICIAL, calcular, redondear, redondearA, validarConfig };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Calculo = api;
})(typeof window !== "undefined" ? window : globalThis);
