const MAXIMO_UNIDADES_PRODUCTO = 20;
const MAXIMO_CARACTERES_MENSAJE = 60;
const NOMBRES_DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const COLORES_AVISO = { exito: "#4b2e24", info: "#8a5257", error: "#a3392f" };
const EXPRESION_DIGITOS = /\D/g;

const MODOS_GLUTEN = {
  con: {
    clave: "con",
    ruta: "/tortas/con-gluten",
    titulo: "Tortas con gluten",
    etiqueta: "Con gluten",
    descripcion: "Armá tu torta paso a paso: forma, porciones, masa, relleno y decoración.",
    imagen: "assets/img/categoria-con-gluten.jpg",
  },
  sin: {
    clave: "sin",
    ruta: "/tortas/sin-gluten",
    titulo: "Tortas sin gluten",
    etiqueta: "Sin gluten",
    descripcion: "Las mismas opciones, elaboradas sin gluten. Los ingredientes con trigo aparecen deshabilitados.",
    imagen: "assets/img/categoria-sin-gluten.jpg",
  },
};

const elementos = {
  contenido: document.getElementById("contenido"),
  navegacion: document.getElementById("navegacionPrincipal"),
  contadorPedido: document.getElementById("contadorPedido"),
  pantallaCarga: document.getElementById("pantallaCarga"),
};

function crearConfiguracionTortaInicial() {
  return {
    gluten: "con",
    formatoId: "redonda",
    formaEspecialId: "corazon",
    letras: [],
    numeros: [],
    porciones: 20,
    masaId: "vainilla",
    rellenoId: "dulce-de-leche",
    decoracionId: "clasica",
    mensaje: "",
  };
}

function crearPedidoVacio() {
  return {
    items: [],
    fecha: "",
    hora: "",
    entrega: { zonaId: "retiro", direccion: "" },
    cliente: { nombre: "", telefono: "", notas: "" },
  };
}

const estado = {
  catalogo: null,
  mensajeErrorCarga: "",
  rutaActual: "/",
  configuracionTorta: crearConfiguracionTortaInicial(),
  seleccionProductos: {},
  pedido: crearPedidoVacio(),
  pedidoEnEdicionId: null,
  mesCalendario: { anio: new Date().getFullYear(), mes: new Date().getMonth() },
};

/* ---------- Utilidades de DOM ---------- */

function crearElemento(etiqueta, { clase, texto, atributos = {}, eventos = {} } = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);

  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;

  Object.entries(atributos).forEach(([nombre, valor]) => {
    if (valor === false || valor === null || valor === undefined) return;
    elemento.setAttribute(nombre, valor === true ? "" : valor);
  });

  Object.entries(eventos).forEach(([evento, manejador]) => {
    elemento.addEventListener(evento, manejador);
  });

  hijos.filter(Boolean).forEach((hijo) => elemento.append(hijo));
  return elemento;
}

function renderizarConservandoFoco(renderizar) {
  const claveActiva = document.activeElement ? document.activeElement.dataset.clave : undefined;
  renderizar();

  if (!claveActiva) return;
  const elementoAnterior = document.querySelector(`[data-clave="${claveActiva}"]`);
  if (elementoAnterior) elementoAnterior.focus({ preventScroll: true });
}

function renderizarVistaActual() {
  renderizarConservandoFoco(() => RUTAS[estado.rutaActual]());
}

/* ---------- Avisos con librerías externas ---------- */

function mostrarAviso(mensaje, tipo = "exito") {
  Toastify({
    text: mensaje,
    duration: 3200,
    gravity: "bottom",
    position: "right",
    close: true,
    style: { background: COLORES_AVISO[tipo] || COLORES_AVISO.exito },
  }).showToast();
}

async function pedirConfirmacion({ titulo, texto, textoConfirmar, esPeligro = false }) {
  const { isConfirmed } = await Swal.fire({
    title: titulo,
    text: texto,
    icon: esPeligro ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Volver",
    confirmButtonColor: esPeligro ? COLORES_AVISO.error : COLORES_AVISO.exito,
    reverseButtons: true,
  });
  return isConfirmed;
}

function obtenerEtiquetaGluten(gluten) {
  return gluten === "sin" ? "SIN GLUTEN" : "CON GLUTEN";
}

function describirConteoGluten(items) {
  const { con, sin } = contarItemsPorGluten(items);
  const partes = [];

  if (con > 0) partes.push(`${con} con gluten`);
  if (sin > 0) partes.push(`${sin} sin gluten`);
  return `Incluye ${partes.join(" y ")}`;
}

function mostrarAlertaItemAgregado({ gluten, nombre, cantidad, precioUnitario }) {
  const prefijoCantidad = cantidad > 1 ? `${cantidad} x ` : "";

  return Swal.fire({
    icon: gluten === "sin" ? "info" : "success",
    title: `Agregaste a tu pedido: ${obtenerEtiquetaGluten(gluten)}`,
    text: `${prefijoCantidad}${nombre}. Subtotal: ${formatearPrecio(precioUnitario * cantidad)}.`,
    showCancelButton: true,
    confirmButtonText: "Ver mi pedido",
    cancelButtonText: "Seguir eligiendo",
    confirmButtonColor: COLORES_AVISO.exito,
    reverseButtons: true,
  });
}

/* ---------- Rutas ---------- */

const RUTAS = {
  "/": renderizarVistaInicio,
  "/tortas/con-gluten": () => renderizarVistaTortas("con"),
  "/tortas/sin-gluten": () => renderizarVistaTortas("sin"),
  "/otras-opciones": renderizarVistaOtrasOpciones,
  "/pedido": renderizarVistaPedido,
  "/mis-pedidos": renderizarVistaMisPedidos,
};

function obtenerRutaActual() {
  const ruta = window.location.hash.replace(/^#/, "");
  return RUTAS[ruta] ? ruta : "/";
}

function navegarA(ruta) {
  if (obtenerRutaActual() === ruta && window.location.hash === `#${ruta}`) {
    enrutar();
    return;
  }
  window.location.hash = `#${ruta}`;
}

function marcarNavegacion(ruta) {
  elementos.navegacion.querySelectorAll("a").forEach((enlace) => {
    if (enlace.dataset.ruta === ruta) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });
}

function actualizarContadorPedido() {
  const unidades = estado.pedido.items.reduce((suma, { cantidad }) => suma + cantidad, 0);
  elementos.contadorPedido.textContent = String(unidades);
}

function enrutar() {
  const ruta = obtenerRutaActual();
  estado.rutaActual = ruta;
  marcarNavegacion(ruta);

  if (estado.mensajeErrorCarga) {
    renderizarErrorDeCarga();
  } else {
    if (ruta.startsWith("/tortas/")) prepararConfiguracionTorta(ruta.endsWith("sin-gluten") ? "sin" : "con");
    RUTAS[ruta]();
    actualizarContadorPedido();
  }

  window.scrollTo(0, 0);
  elementos.contenido.focus({ preventScroll: true });
}

function renderizarErrorDeCarga() {
  elementos.contenido.replaceChildren(
    crearElemento("section", { clase: "vista vista--angosta" }, [
      crearElemento("div", { clase: "aviso aviso--error" }, [
        crearElemento("h1", { texto: "No pudimos cargar el catálogo" }),
        crearElemento("p", {
          texto:
            "Revisá tu conexión y volvé a intentar. Si abriste el archivo con doble clic, usá un servidor local como Live Server.",
        }),
        crearElemento("p", { clase: "aviso__detalle", texto: estado.mensajeErrorCarga }),
        crearElemento("button", {
          clase: "boton boton--principal",
          texto: "Reintentar",
          atributos: { type: "button" },
          eventos: { click: iniciarAplicacion },
        }),
      ]),
    ])
  );
}

/* ---------- Vista: inicio ---------- */

async function elegirApartado({ titulo, texto, icono, ruta }) {
  await Swal.fire({
    icon: icono,
    title: titulo,
    text: texto,
    timer: 2400,
    timerProgressBar: true,
    confirmButtonText: "Ir ahora",
    confirmButtonColor: COLORES_AVISO.exito,
  });
  navegarA(ruta);
}

function crearTarjetaCategoria({ titulo, descripcion, imagen, etiqueta, alElegir }) {
  return crearElemento("button", { clase: "categoria", atributos: { type: "button" }, eventos: { click: alElegir } }, [
    crearElemento("img", { clase: "categoria__imagen", atributos: { src: imagen, alt: "", width: 800, height: 600, loading: "lazy" } }),
    crearElemento("span", { clase: "categoria__cuerpo" }, [
      crearElemento("span", { clase: "etiqueta", texto: etiqueta }),
      crearElemento("strong", { clase: "categoria__titulo", texto: titulo }),
      crearElemento("span", { texto: descripcion }),
    ]),
  ]);
}

function renderizarVistaInicio() {
  const { reglas, negocio } = estado.catalogo.configuracion;

  const portada = crearElemento("section", { clase: "portada" }, [
    crearElemento("div", { clase: "portada__texto" }, [
      crearElemento("h1", { texto: "Tortas hechas a tu medida, con y sin gluten" }),
      crearElemento("p", {
        texto: "Elegí el tamaño, la forma, la masa, el relleno y la decoración. Nosotros la hacemos y vos elegís cuándo recibirla.",
      }),
      crearElemento("button", {
        clase: "boton boton--principal",
        texto: "Elegir qué pedir",
        atributos: { type: "button" },
        eventos: {
          click: () => document.getElementById("categorias").scrollIntoView({ behavior: "smooth", block: "start" }),
        },
      }),
    ]),
    crearElemento("img", {
      clase: "portada__imagen",
      atributos: { src: "assets/img/portada.jpg", alt: "", width: 1000, height: 1250 },
    }),
  ]);

  const categorias = crearElemento("section", { clase: "vista", atributos: { id: "categorias", "aria-labelledby": "tituloCategorias" } }, [
    crearElemento("h2", { texto: "¿Qué querés pedir?", atributos: { id: "tituloCategorias" } }),
    crearElemento("div", { clase: "categorias" }, [
      crearTarjetaCategoria({
        titulo: "Tortas con gluten",
        descripcion: "Con la forma, el relleno y la decoración que elijas.",
        imagen: "assets/img/categoria-con-gluten.jpg",
        etiqueta: "Con gluten",
        alElegir: () =>
          elegirApartado({
            titulo: "Elegiste tortas CON GLUTEN",
            texto: "Te llevamos al apartado de tortas con gluten.",
            icono: "success",
            ruta: MODOS_GLUTEN.con.ruta,
          }),
      }),
      crearTarjetaCategoria({
        titulo: "Tortas sin gluten",
        descripcion: "Las mismas opciones, elaboradas sin gluten.",
        imagen: "assets/img/categoria-sin-gluten.jpg",
        etiqueta: "Sin gluten",
        alElegir: () =>
          elegirApartado({
            titulo: "Elegiste tortas SIN GLUTEN",
            texto: "Te llevamos al apartado de tortas sin gluten. Los rellenos con trigo no van a estar disponibles.",
            icono: "info",
            ruta: MODOS_GLUTEN.sin.ruta,
          }),
      }),
      crearTarjetaCategoria({
        titulo: "Otras opciones de pastelería",
        descripcion: "Alfajores, lemon pie, brownies y más, con o sin gluten.",
        imagen: "assets/img/categoria-otras.jpg",
        etiqueta: "Con y sin gluten",
        alElegir: () =>
          elegirApartado({
            titulo: "Otras opciones de pastelería",
            texto: "Cada producto lo podés elegir con o sin gluten.",
            icono: "info",
            ruta: "/otras-opciones",
          }),
      }),
    ]),
  ]);

  const pasos = crearElemento("section", { clase: "vista", atributos: { "aria-labelledby": "tituloPasos" } }, [
    crearElemento("h2", { texto: "Cómo funciona", atributos: { id: "tituloPasos" } }),
    crearElemento("ol", { clase: "pasos-inicio" }, [
      crearElemento("li", { texto: "Elegí tu pedido: tortas con o sin gluten y otras opciones de pastelería." }),
      crearElemento("li", {
        texto: `Elegí la fecha: pedí con al menos ${reglas.diasAnticipacionNormal} días de anticipación. Si lo necesitás antes, el pedido tiene un recargo del ${reglas.recargoUrgentePorcentaje}%.`,
      }),
      crearElemento("li", {
        texto: `Confirmá tu pedido. Ante cualquier duda, comunicate con ${negocio.responsable} al ${formatearTelefono(negocio.telefono)}.`,
      }),
    ]),
    crearElemento("p", {
      clase: "ayuda",
      texto: "Entregamos de lunes a sábado. El último horario de entrega es el sábado a las 20:00 y los domingos descansamos.",
    }),
  ]);

  elementos.contenido.replaceChildren(portada, categorias, pasos);
}

/* ---------- Componentes compartidos ---------- */

function crearOpcion({ grupo, valor, seleccionada, titulo, detalle, textoExtra, icono, imagen, deshabilitada = false, motivo, variante = "tarjeta", alCambiar }) {
  const clases = ["opcion", `opcion--${variante}`];
  if (seleccionada) clases.push("opcion--elegida");
  if (deshabilitada) clases.push("opcion--deshabilitada");

  let visual = null;
  if (imagen) {
    visual = crearElemento("img", { clase: "opcion__imagen", atributos: { src: imagen, alt: "", width: 400, height: 400, loading: "lazy" } });
  } else if (icono) {
    visual = crearElemento("img", { clase: "opcion__icono", atributos: { src: icono, alt: "", width: 44, height: 44 } });
  }

  return crearElemento("label", { clase: clases.join(" "), atributos: { title: deshabilitada ? motivo : false } }, [
    crearElemento("input", {
      clase: "opcion__radio",
      atributos: {
        type: "radio",
        name: grupo,
        value: valor,
        checked: seleccionada,
        disabled: deshabilitada,
        "data-clave": `${grupo}-${valor}`,
      },
      eventos: { change: alCambiar },
    }),
    visual,
    crearElemento("span", { clase: "opcion__texto" }, [
      crearElemento("strong", { texto: titulo }),
      detalle ? crearElemento("span", { clase: "opcion__detalle", texto: detalle }) : null,
      textoExtra ? crearElemento("span", { clase: "opcion__extra", texto: textoExtra }) : null,
    ]),
  ]);
}

function crearTextoExtra(monto, sufijo = "") {
  return monto > 0 ? `+ ${formatearPrecio(monto)}${sufijo}` : "Sin cargo extra";
}

function crearSeccion(numero, titulo, ayuda, hijos) {
  return crearElemento("section", { clase: "seccion" }, [
    crearElemento("h2", { clase: "seccion__titulo" }, [
      crearElemento("span", { clase: "seccion__numero", texto: String(numero) }),
      document.createTextNode(titulo),
    ]),
    ayuda ? crearElemento("p", { clase: "ayuda", texto: ayuda }) : null,
    ...hijos,
  ]);
}

function crearEncabezadoApartado({ etiqueta, claseEtiqueta, titulo, descripcion, imagen }) {
  return crearElemento("section", { clase: "apartado" }, [
    crearElemento("div", { clase: "apartado__texto" }, [
      crearElemento("span", { clase: `etiqueta ${claseEtiqueta}`, texto: etiqueta }),
      crearElemento("h1", { texto: titulo }),
      crearElemento("p", { texto: descripcion }),
    ]),
    crearElemento("img", { clase: "apartado__imagen", atributos: { src: imagen, alt: "", width: 800, height: 600 } }),
  ]);
}

function crearCampoTexto({ id, etiqueta, valor, tipo = "text", autocompletar, esParrafo = false, alEscribir, maximo }) {
  const atributosComunes = { id, name: id, "aria-describedby": `error-${id}`, "data-clave": id, maxlength: maximo };
  const eventos = { input: (evento) => alEscribir(evento.target.value) };

  const entrada = esParrafo
    ? crearElemento("textarea", { clase: "campo__entrada", texto: valor, atributos: { ...atributosComunes, rows: 3 }, eventos })
    : crearElemento("input", {
        clase: "campo__entrada",
        atributos: { ...atributosComunes, type: tipo, value: valor, autocomplete: autocompletar },
        eventos,
      });

  return crearElemento("div", { clase: "campo" }, [
    crearElemento("label", { clase: "campo__etiqueta", texto: etiqueta, atributos: { for: id } }),
    entrada,
    crearElemento("p", { clase: "campo__error", atributos: { id: `error-${id}` } }),
  ]);
}

/* ---------- Vista: configurador de tortas ---------- */

function prepararConfiguracionTorta(modo) {
  estado.configuracionTorta.gluten = modo;
  const relleno = estado.catalogo.tortas.rellenos.find(({ id }) => id === estado.configuracionTorta.rellenoId);

  if (modo === "sin" && !relleno.aptoSinGluten) {
    estado.configuracionTorta.rellenoId = "dulce-de-leche";
  }
}

function actualizarVistaTortas() {
  renderizarConservandoFoco(() => renderizarVistaTortas(estado.configuracionTorta.gluten));
}

function obtenerCantidadFiguras() {
  return obtenerFigurasActivas(estado.configuracionTorta).length;
}

function ajustarPorcionesAlMinimo() {
  const { reglas } = estado.catalogo.configuracion;
  const minimo = calcularPorcionesMinimas(obtenerCantidadFiguras(), reglas);
  if (estado.configuracionTorta.porciones >= minimo) return;

  const opcionValida = estado.catalogo.tortas.porciones.find(({ cantidad }) => cantidad >= minimo);
  if (!opcionValida) return;

  estado.configuracionTorta.porciones = opcionValida.cantidad;
  mostrarAviso(
    `Subimos las porciones a ${opcionValida.cantidad} para que cada figura tenga al menos ${reglas.porcionesMinimasPorFigura}.`,
    "info"
  );
}

function elegirFormato(formatoId) {
  estado.configuracionTorta.formatoId = formatoId;
  ajustarPorcionesAlMinimo();
  actualizarVistaTortas();
}

function elegirFormaEspecial(formaEspecialId) {
  estado.configuracionTorta.formaEspecialId = formaEspecialId;
  ajustarPorcionesAlMinimo();
  actualizarVistaTortas();
}

function agregarFigura(campo, valor) {
  const { maximoFigurasPorTipo } = estado.catalogo.configuracion.reglas;
  const figurasActuales = estado.configuracionTorta[campo];

  if (figurasActuales.length >= maximoFigurasPorTipo) {
    const nombreFiguras = campo === "letras" ? "letras" : "números";
    mostrarAviso(`Podés elegir hasta ${maximoFigurasPorTipo} ${nombreFiguras}.`, "info");
    return;
  }
  estado.configuracionTorta[campo] = [...figurasActuales, valor];
  ajustarPorcionesAlMinimo();
  actualizarVistaTortas();
}

function quitarFigura(campo, posicion) {
  estado.configuracionTorta[campo] = estado.configuracionTorta[campo].filter((figura, indice) => indice !== posicion);
  actualizarVistaTortas();
}

function elegirCampoTorta(campo, valor) {
  estado.configuracionTorta[campo] = valor;
  actualizarVistaTortas();
}

function crearSelectorFiguras({ titulo, campo, singular, valores }) {
  const { maximoFigurasPorTipo } = estado.catalogo.configuracion.reglas;
  const elegidas = estado.configuracionTorta[campo];

  const fichasElegidas = elegidas.map((valor, posicion) =>
    crearElemento("button", {
      clase: "figura-elegida",
      texto: valor,
      atributos: { type: "button", "aria-label": `Quitar ${singular} ${valor}`, "data-clave": `quitar-${campo}-${posicion}` },
      eventos: { click: () => quitarFigura(campo, posicion) },
    })
  );

  const botones = valores.map((valor) =>
    crearElemento("button", {
      clase: "figura-boton",
      texto: valor,
      atributos: { type: "button", "aria-label": `Agregar ${singular} ${valor}`, "data-clave": `agregar-${campo}-${valor}` },
      eventos: { click: () => agregarFigura(campo, valor) },
    })
  );

  return crearElemento("div", { clase: "selector-figuras" }, [
    crearElemento("h3", { clase: "subtitulo", texto: `${titulo}: ${elegidas.length} de ${maximoFigurasPorTipo}` }),
    crearElemento("div", { clase: "figuras-elegidas", atributos: { "aria-label": `${titulo} elegidos` } }, fichasElegidas),
    crearElemento("div", { clase: "figuras-grilla" }, botones),
  ]);
}

function crearTamanosFiguras() {
  const figuras = calcularFigurasConTamano(estado.configuracionTorta, estado.catalogo);

  if (figuras.length === 0) {
    return crearElemento("p", {
      clase: "ayuda",
      texto: "Elegí al menos una letra o un número. Repartimos las porciones entre todas las figuras y calculamos el tamaño de cada una.",
    });
  }

  const filas = figuras.map(({ tipo, valor, porciones, alturaCm }) =>
    crearElemento("li", {}, [
      crearElemento("strong", { texto: `${tipo} ${valor}` }),
      crearElemento("span", { texto: `${porciones} porciones, ${alturaCm} cm de alto` }),
    ])
  );

  return crearElemento("div", { clase: "tamanos-figuras" }, [
    crearElemento("h3", { clase: "subtitulo", texto: "Tamaño de cada figura" }),
    crearElemento("ul", {}, filas),
  ]);
}

function crearSeccionFormato() {
  const { formatos, formasEspeciales, figuras } = estado.catalogo.tortas;
  const { formatoId, formaEspecialId } = estado.configuracionTorta;

  const opcionesFormato = formatos.map(({ id, nombre, descripcion, extra, icono }) =>
    crearOpcion({
      grupo: "formato",
      valor: id,
      seleccionada: id === formatoId,
      titulo: nombre,
      detalle: descripcion,
      textoExtra: id === "especial" ? "Cargo según la forma" : crearTextoExtra(extra),
      icono,
      alCambiar: () => elegirFormato(id),
    })
  );

  const bloques = [
    crearElemento("div", { clase: "opciones opciones--tres", atributos: { role: "radiogroup", "aria-label": "Formato de la torta" } }, opcionesFormato),
  ];

  if (formatoId === "especial") {
    const opcionesForma = formasEspeciales.map((forma) =>
      crearOpcion({
        grupo: "forma",
        valor: forma.id,
        seleccionada: forma.id === formaEspecialId,
        titulo: forma.nombre,
        textoExtra: forma.tipo === "figuras" ? crearTextoExtra(forma.extraPorFigura, " por figura") : crearTextoExtra(forma.extra),
        icono: forma.icono,
        variante: "forma",
        alCambiar: () => elegirFormaEspecial(forma.id),
      })
    );

    bloques.push(
      crearElemento("h3", { clase: "subtitulo", texto: "Elegí la forma" }),
      crearElemento("div", { clase: "opciones opciones--formas", atributos: { role: "radiogroup", "aria-label": "Forma especial" } }, opcionesForma)
    );

    if (formaEspecialId === "figuras") {
      bloques.push(
        crearElemento("div", { clase: "panel-figuras" }, [
          crearSelectorFiguras({ titulo: "Letras", campo: "letras", singular: "letra", valores: figuras.letras }),
          crearSelectorFiguras({ titulo: "Números", campo: "numeros", singular: "número", valores: figuras.numeros }),
          crearTamanosFiguras(),
        ])
      );
    }
  }

  return crearSeccion(1, "Formato", "Las formas especiales tienen un cargo extra. Podés elegir hasta 3 letras y hasta 3 números.", bloques);
}

function crearSeccionPorciones() {
  const { porciones: opcionesPorciones } = estado.catalogo.tortas;
  const { reglas } = estado.catalogo.configuracion;
  const configuracion = estado.configuracionTorta;
  const cantidadFiguras = obtenerCantidadFiguras();
  const minimo = calcularPorcionesMinimas(cantidadFiguras, reglas);

  const opciones = opcionesPorciones.map(({ cantidad }) =>
    crearOpcion({
      grupo: "porciones",
      valor: cantidad,
      seleccionada: cantidad === configuracion.porciones,
      titulo: String(cantidad),
      variante: "chip",
      deshabilitada: cantidad < minimo,
      motivo: `Con ${cantidadFiguras} figuras necesitás al menos ${minimo} porciones`,
      alCambiar: () => elegirCampoTorta("porciones", cantidad),
    })
  );

  const usaFiguras = cantidadFiguras > 0;
  const ayudaMedidas = usaFiguras
    ? `Cada figura necesita al menos ${reglas.porcionesMinimasPorFigura} porciones. Con ${cantidadFiguras} figuras, el mínimo es ${minimo}.`
    : `Medidas aproximadas: ${describirMedidas(configuracion, estado.catalogo)}.`;

  return crearSeccion(2, "Porciones", null, [
    crearElemento("div", { clase: "opciones opciones--chips", atributos: { role: "radiogroup", "aria-label": "Cantidad de porciones" } }, opciones),
    crearElemento("p", { clase: "ayuda", texto: ayudaMedidas }),
  ]);
}

function crearSeccionMasa() {
  const { masas } = estado.catalogo.tortas;
  const { porciones, masaId } = estado.configuracionTorta;

  const opciones = masas.map(({ id, nombre, extraPorPorcion }) =>
    crearOpcion({
      grupo: "masa",
      valor: id,
      seleccionada: id === masaId,
      titulo: nombre,
      textoExtra: extraPorPorcion > 0 ? crearTextoExtra(extraPorPorcion * porciones) : undefined,
      variante: "chip",
      alCambiar: () => elegirCampoTorta("masaId", id),
    })
  );

  return crearSeccion(3, "Masa", null, [
    crearElemento("div", { clase: "opciones opciones--chips", atributos: { role: "radiogroup", "aria-label": "Sabor de la masa" } }, opciones),
  ]);
}

function crearSeccionRelleno() {
  const { rellenos } = estado.catalogo.tortas;
  const { porciones, rellenoId, gluten } = estado.configuracionTorta;

  const opciones = rellenos.map(({ id, nombre, extraPorPorcion, aptoSinGluten, motivoNoApto }) =>
    crearOpcion({
      grupo: "relleno",
      valor: id,
      seleccionada: id === rellenoId,
      titulo: nombre,
      textoExtra: extraPorPorcion > 0 ? crearTextoExtra(extraPorPorcion * porciones) : undefined,
      variante: "chip",
      deshabilitada: gluten === "sin" && !aptoSinGluten,
      motivo: `No disponible sin gluten. ${motivoNoApto || ""}`.trim(),
      alCambiar: () => elegirCampoTorta("rellenoId", id),
    })
  );

  const rellenosNoAptos = rellenos.filter(({ aptoSinGluten }) => !aptoSinGluten);
  const notaSinGluten =
    gluten === "sin" && rellenosNoAptos.length > 0
      ? crearElemento(
          "p",
          { clase: "aviso aviso--info" },
          [document.createTextNode(rellenosNoAptos.map(({ nombre, motivoNoApto }) => `${nombre} no está disponible sin gluten. ${motivoNoApto}`).join(" "))]
        )
      : null;

  return crearSeccion(4, "Relleno", null, [
    crearElemento("div", { clase: "opciones opciones--chips", atributos: { role: "radiogroup", "aria-label": "Relleno" } }, opciones),
    notaSinGluten,
  ]);
}

function crearSeccionDecoracion() {
  const { decoraciones } = estado.catalogo.tortas;
  const { porciones, decoracionId, mensaje } = estado.configuracionTorta;

  const opciones = decoraciones.map((decoracion) =>
    crearOpcion({
      grupo: "decoracion",
      valor: decoracion.id,
      seleccionada: decoracion.id === decoracionId,
      titulo: decoracion.nombre,
      detalle: decoracion.descripcion,
      textoExtra: crearTextoExtra(calcularPrecioDecoracion(decoracion, porciones)),
      imagen: decoracion.imagen,
      variante: "foto",
      alCambiar: () => elegirCampoTorta("decoracionId", decoracion.id),
    })
  );

  const campoMensaje = crearCampoTexto({
    id: "mensajeTorta",
    etiqueta: "Mensaje o tema (opcional)",
    valor: mensaje,
    maximo: MAXIMO_CARACTERES_MENSAJE,
    alEscribir: (texto) => {
      estado.configuracionTorta.mensaje = texto;
      actualizarResumenTorta();
    },
  });

  return crearSeccion(5, "Decoración", "El precio de la decoración depende de las porciones que elegiste.", [
    crearElemento("div", { clase: "opciones opciones--fotos", atributos: { role: "radiogroup", "aria-label": "Decoración" } }, opciones),
    campoMensaje,
  ]);
}

function validarConfiguracionTorta() {
  const { reglas } = estado.catalogo.configuracion;
  const { porciones, gluten, rellenoId, formatoId, formaEspecialId } = estado.configuracionTorta;
  const cantidadFiguras = obtenerCantidadFiguras();
  const relleno = estado.catalogo.tortas.rellenos.find(({ id }) => id === rellenoId);

  if (formatoId === "especial" && formaEspecialId === "figuras" && cantidadFiguras === 0) {
    return "Elegí al menos una letra o un número.";
  }
  if (porciones < calcularPorcionesMinimas(cantidadFiguras, reglas)) {
    return "Elegí más porciones para que cada figura tenga el mínimo.";
  }
  if (gluten === "sin" && !relleno.aptoSinGluten) {
    return "Elegí un relleno disponible sin gluten.";
  }
  return "";
}

function crearResumenTorta() {
  const configuracion = estado.configuracionTorta;
  const { lineas, total } = calcularPrecioTorta(configuracion, estado.catalogo);
  const problema = validarConfiguracionTorta();

  const filas = lineas.map(({ concepto, monto }) =>
    crearElemento("li", {}, [
      crearElemento("span", { texto: concepto }),
      crearElemento("span", { clase: "resumen__monto", texto: formatearPrecio(monto) }),
    ])
  );

  return crearElemento("aside", { clase: "resumen", atributos: { id: "resumenTorta", "aria-label": "Resumen de tu torta" } }, [
    crearElemento("h2", { texto: "Tu torta" }),
    crearElemento("span", { clase: `etiqueta etiqueta--${configuracion.gluten}`, texto: MODOS_GLUTEN[configuracion.gluten].etiqueta }),
    crearElemento("ul", { clase: "resumen__lista" }, filas),
    crearElemento("p", { clase: "resumen__total" }, [
      crearElemento("span", { texto: "Total" }),
      crearElemento("strong", { texto: formatearPrecio(total) }),
    ]),
    problema ? crearElemento("p", { clase: "campo__error", texto: problema }) : null,
    crearElemento("button", {
      clase: "boton boton--principal boton--ancho",
      texto: "Agregar al pedido",
      atributos: { type: "button", disabled: Boolean(problema) },
      eventos: { click: agregarTortaAlPedido },
    }),
  ]);
}

function actualizarResumenTorta() {
  document.getElementById("resumenTorta").replaceWith(crearResumenTorta());
}

async function agregarTortaAlPedido() {
  const problema = validarConfiguracionTorta();
  if (problema) {
    mostrarAviso(problema, "error");
    return;
  }

  const configuracion = { ...estado.configuracionTorta };
  const { total } = calcularPrecioTorta(configuracion, estado.catalogo);
  const itemTorta = {
    idItem: generarIdItem(),
    tipo: "torta",
    gluten: configuracion.gluten,
    cantidad: 1,
    nombre: armarNombreTorta(configuracion, estado.catalogo),
    detalle: armarDetalleTorta(configuracion, estado.catalogo),
    precioUnitario: total,
  };

  estado.pedido.items = [...estado.pedido.items, itemTorta];
  persistirBorrador();
  actualizarContadorPedido();

  const { isConfirmed } = await mostrarAlertaItemAgregado(itemTorta);
  if (isConfirmed) navegarA("/pedido");
}

function renderizarVistaTortas(modo) {
  const { clave, titulo, etiqueta, descripcion, imagen } = MODOS_GLUTEN[modo];

  const encabezado = crearEncabezadoApartado({
    etiqueta,
    claseEtiqueta: `etiqueta--${clave}`,
    titulo,
    descripcion,
    imagen,
  });

  const pasos = crearElemento("div", { clase: "configurador__pasos" }, [
    crearSeccionFormato(),
    crearSeccionPorciones(),
    crearSeccionMasa(),
    crearSeccionRelleno(),
    crearSeccionDecoracion(),
  ]);

  elementos.contenido.replaceChildren(
    encabezado,
    crearElemento("div", { clase: "vista configurador" }, [pasos, crearResumenTorta()])
  );
}

/* ---------- Vista: otras opciones ---------- */

function obtenerSeleccionProducto(idProducto) {
  return estado.seleccionProductos[idProducto] || { gluten: "con", cantidad: 1 };
}

function actualizarSeleccionProducto(idProducto, cambios) {
  estado.seleccionProductos = {
    ...estado.seleccionProductos,
    [idProducto]: { ...obtenerSeleccionProducto(idProducto), ...cambios },
  };
  renderizarVistaActual();
}

function crearSelectorCantidad({ cantidad, nombre, alCambiar, clave }) {
  return crearElemento("div", { clase: "cantidad", atributos: { role: "group", "aria-label": `Cantidad de ${nombre}` } }, [
    crearElemento("button", {
      clase: "cantidad__boton",
      texto: "−",
      atributos: { type: "button", "aria-label": `Una unidad menos de ${nombre}`, disabled: cantidad <= 1, "data-clave": `${clave}-menos` },
      eventos: { click: () => alCambiar(cantidad - 1) },
    }),
    crearElemento("output", { clase: "cantidad__valor", texto: String(cantidad) }),
    crearElemento("button", {
      clase: "cantidad__boton",
      texto: "+",
      atributos: { type: "button", "aria-label": `Una unidad más de ${nombre}`, disabled: cantidad >= MAXIMO_UNIDADES_PRODUCTO, "data-clave": `${clave}-mas` },
      eventos: { click: () => alCambiar(cantidad + 1) },
    }),
  ]);
}

function crearTarjetaProducto(producto) {
  const { reglas } = estado.catalogo.configuracion;
  const { id, nombre, descripcion, unidad, imagen } = producto;
  const { gluten, cantidad } = obtenerSeleccionProducto(id);
  const precioUnitario = calcularPrecioProducto(producto, gluten, reglas);

  const opcionesGluten = Object.values(MODOS_GLUTEN).map(({ clave, etiqueta }) =>
    crearOpcion({
      grupo: `gluten-${id}`,
      valor: clave,
      seleccionada: clave === gluten,
      titulo: etiqueta,
      variante: "segmento",
      alCambiar: () => actualizarSeleccionProducto(id, { gluten: clave }),
    })
  );

  return crearElemento("article", { clase: "producto" }, [
    crearElemento("img", { clase: "producto__imagen", atributos: { src: imagen, alt: "", width: 800, height: 600, loading: "lazy" } }),
    crearElemento("div", { clase: "producto__cuerpo" }, [
      crearElemento("h3", { texto: nombre }),
      crearElemento("p", { texto: descripcion }),
      crearElemento("p", { clase: "producto__unidad", texto: unidad }),
      crearElemento("div", { clase: "opciones opciones--segmentos", atributos: { role: "radiogroup", "aria-label": `Gluten en ${nombre}` } }, opcionesGluten),
      crearElemento("p", { clase: "producto__precio" }, [
        crearElemento("strong", { texto: formatearPrecio(precioUnitario) }),
        crearElemento("span", { texto: gluten === "sin" ? `Incluye ${reglas.recargoSinGlutenPorcentaje}% por elaboración sin gluten` : "Precio por unidad" }),
      ]),
      crearElemento("div", { clase: "producto__acciones" }, [
        crearSelectorCantidad({
          cantidad,
          nombre,
          clave: `cantidad-${id}`,
          alCambiar: (nuevaCantidad) => actualizarSeleccionProducto(id, { cantidad: nuevaCantidad }),
        }),
        crearElemento("button", {
          clase: "boton boton--principal",
          texto: "Agregar al pedido",
          atributos: { type: "button", "aria-label": `Agregar ${nombre} al pedido`, "data-clave": `agregar-${id}` },
          eventos: { click: () => agregarProductoAlPedido(producto) },
        }),
      ]),
    ]),
  ]);
}

async function agregarProductoAlPedido(producto) {
  const { reglas } = estado.catalogo.configuracion;
  const { id, nombre, unidad } = producto;
  const { gluten, cantidad } = obtenerSeleccionProducto(id);
  const precioUnitario = calcularPrecioProducto(producto, gluten, reglas);
  const nombreCompleto = `${nombre} (${unidad})`;

  const itemExistente = estado.pedido.items.find(
    (item) => item.tipo === "producto" && item.productoId === id && item.gluten === gluten
  );

  if (itemExistente) {
    estado.pedido.items = estado.pedido.items.map((item) =>
      item === itemExistente ? { ...item, cantidad: Math.min(item.cantidad + cantidad, MAXIMO_UNIDADES_PRODUCTO) } : item
    );
  } else {
    estado.pedido.items = [
      ...estado.pedido.items,
      { idItem: generarIdItem(), tipo: "producto", productoId: id, gluten, cantidad, nombre: nombreCompleto, precioUnitario },
    ];
  }

  persistirBorrador();
  actualizarContadorPedido();

  const { isConfirmed } = await mostrarAlertaItemAgregado({ gluten, nombre: nombreCompleto, cantidad, precioUnitario });
  if (isConfirmed) navegarA("/pedido");
}

function renderizarVistaOtrasOpciones() {
  const encabezado = crearEncabezadoApartado({
    etiqueta: "Con y sin gluten",
    claseEtiqueta: "etiqueta--otras",
    titulo: "Otras opciones de pastelería",
    descripcion: "Elegí cada producto con o sin gluten y la cantidad que necesitás.",
    imagen: "assets/img/categoria-otras.jpg",
  });

  elementos.contenido.replaceChildren(
    encabezado,
    crearElemento("section", { clase: "vista" }, [
      crearElemento("div", { clase: "productos" }, estado.catalogo.productos.map(crearTarjetaProducto)),
    ])
  );
}

/* ---------- Vista: pedido en curso ---------- */

function persistirBorrador() {
  const { pedido, pedidoEnEdicionId } = estado;
  guardarBorrador({ pedido, pedidoEnEdicionId });
}

function obtenerMesInicial() {
  const referencia = estado.pedido.fecha ? convertirISOaFecha(estado.pedido.fecha) : new Date();
  return { anio: referencia.getFullYear(), mes: referencia.getMonth() };
}

function restaurarBorrador() {
  const borrador = obtenerBorrador();
  if (!borrador) return;

  const { pedido = {}, pedidoEnEdicionId = null } = borrador;
  const vacio = crearPedidoVacio();

  estado.pedido = {
    ...vacio,
    ...pedido,
    entrega: { ...vacio.entrega, ...pedido.entrega },
    cliente: { ...vacio.cliente, ...pedido.cliente },
    items: pedido.items || [],
  };
  estado.pedidoEnEdicionId = obtenerPedidos().some(({ id }) => id === pedidoEnEdicionId) ? pedidoEnEdicionId : null;

  if (estado.pedido.fecha && !obtenerEstadoDia(estado.pedido.fecha, estado.catalogo).disponible) {
    estado.pedido.fecha = "";
    estado.pedido.hora = "";
  }
}

function reiniciarPedido() {
  estado.pedido = crearPedidoVacio();
  estado.pedidoEnEdicionId = null;
  estado.mesCalendario = obtenerMesInicial();
  borrarBorrador();
}

function quitarItem(idItem) {
  estado.pedido.items = estado.pedido.items.filter((item) => item.idItem !== idItem);
  persistirBorrador();
  actualizarContadorPedido();
  renderizarVistaActual();
}

function cambiarCantidadItem(idItem, nuevaCantidad) {
  const cantidadValida = Math.min(Math.max(nuevaCantidad, 1), MAXIMO_UNIDADES_PRODUCTO);
  estado.pedido.items = estado.pedido.items.map((item) =>
    item.idItem === idItem ? { ...item, cantidad: cantidadValida } : item
  );
  persistirBorrador();
  actualizarContadorPedido();
  renderizarVistaActual();
}

function crearInsigniaGluten(gluten) {
  return crearElemento("span", { clase: `etiqueta etiqueta--${gluten}`, texto: MODOS_GLUTEN[gluten].etiqueta });
}

function crearItemPedido(item) {
  const { idItem, tipo, gluten, cantidad, nombre, detalle, precioUnitario } = item;

  const detalleTorta =
    tipo === "torta"
      ? crearElemento("ul", { clase: "item__detalle" }, detalle.map((linea) => crearElemento("li", { texto: linea })))
      : null;

  const controlCantidad =
    tipo === "producto"
      ? crearSelectorCantidad({
          cantidad,
          nombre,
          clave: `item-${idItem}`,
          alCambiar: (nuevaCantidad) => cambiarCantidadItem(idItem, nuevaCantidad),
        })
      : null;

  return crearElemento("article", { clase: "item" }, [
    crearElemento("div", { clase: "item__cuerpo" }, [
      crearInsigniaGluten(gluten),
      crearElemento("h3", { texto: nombre }),
      detalleTorta,
      controlCantidad,
    ]),
    crearElemento("div", { clase: "item__precio" }, [
      crearElemento("strong", { texto: formatearPrecio(precioUnitario * cantidad) }),
      crearElemento("button", {
        clase: "boton boton--enlace",
        texto: "Quitar",
        atributos: { type: "button", "aria-label": `Quitar ${nombre} del pedido`, "data-clave": `quitar-${idItem}` },
        eventos: { click: () => quitarItem(idItem) },
      }),
    ]),
  ]);
}

/* Calendario */

function cambiarMes(desplazamiento) {
  const { anio, mes } = estado.mesCalendario;
  const nuevoMes = new Date(anio, mes + desplazamiento, 1);
  estado.mesCalendario = { anio: nuevoMes.getFullYear(), mes: nuevoMes.getMonth() };
  renderizarVistaActual();
}

function elegirFecha(fechaISO) {
  estado.pedido.fecha = fechaISO;
  const franjas = obtenerFranjasDelDia(fechaISO, estado.catalogo.entregas.horarios);
  if (!franjas.includes(estado.pedido.hora)) estado.pedido.hora = "";
  persistirBorrador();
  renderizarVistaActual();
}

function elegirHora(hora) {
  estado.pedido.hora = hora;
  persistirBorrador();
  renderizarVistaActual();
}

function crearDiaCalendario(fechaISO, numeroDia) {
  const { reglas } = estado.catalogo.configuracion;
  const { disponible, urgente, motivo } = obtenerEstadoDia(fechaISO, estado.catalogo);
  const estaElegido = fechaISO === estado.pedido.fecha;

  const clases = ["dia"];
  if (!disponible) clases.push("dia--bloqueado");
  if (urgente) clases.push("dia--urgente");
  if (estaElegido) clases.push("dia--elegido");

  const notaRecargo = urgente ? `, con recargo del ${reglas.recargoUrgentePorcentaje}%` : "";
  const notaMotivo = motivo ? `, ${motivo.toLowerCase()}` : "";

  return crearElemento(
    "button",
    {
      clase: clases.join(" "),
      atributos: {
        type: "button",
        disabled: !disponible,
        "aria-pressed": String(estaElegido),
        "aria-label": `${formatearFechaLarga(fechaISO)}${notaRecargo}${notaMotivo}`,
        title: motivo || (urgente ? `Recargo del ${reglas.recargoUrgentePorcentaje}%` : false),
        "data-clave": `dia-${fechaISO}`,
      },
      eventos: { click: () => elegirFecha(fechaISO) },
    },
    [
      crearElemento("span", { texto: String(numeroDia) }),
      urgente ? crearElemento("small", { texto: `+${reglas.recargoUrgentePorcentaje}%` }) : null,
    ]
  );
}

function crearCalendario() {
  const { reglas } = estado.catalogo.configuracion;
  const { anio, mes } = estado.mesCalendario;
  const hoy = new Date();
  const primerDiaDelMes = new Date(anio, mes, 1);
  const diasEnElMes = new Date(anio, mes + 1, 0).getDate();
  const casillasVacias = (primerDiaDelMes.getDay() + 6) % 7;
  const nombreMes = primerDiaDelMes.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth();

  const encabezadosDias = NOMBRES_DIAS_CORTOS.map((nombre) => crearElemento("span", { clase: "calendario__dia-semana", texto: nombre }));
  const casillas = Array.from({ length: casillasVacias }, () => crearElemento("span", { atributos: { "aria-hidden": "true" } }));
  const dias = Array.from({ length: diasEnElMes }, (valorVacio, indice) =>
    crearDiaCalendario(obtenerFechaLocalISO(new Date(anio, mes, indice + 1)), indice + 1)
  );

  return crearElemento("div", { clase: "calendario" }, [
    crearElemento("div", { clase: "calendario__cabecera" }, [
      crearElemento("button", {
        clase: "calendario__mes-boton",
        texto: "‹",
        atributos: { type: "button", "aria-label": "Mes anterior", disabled: esMesActual, "data-clave": "mes-anterior" },
        eventos: { click: () => cambiarMes(-1) },
      }),
      crearElemento("strong", { clase: "calendario__mes", texto: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1), atributos: { "aria-live": "polite" } }),
      crearElemento("button", {
        clase: "calendario__mes-boton",
        texto: "›",
        atributos: { type: "button", "aria-label": "Mes siguiente", "data-clave": "mes-siguiente" },
        eventos: { click: () => cambiarMes(1) },
      }),
    ]),
    crearElemento("div", { clase: "calendario__grilla" }, [...encabezadosDias, ...casillas, ...dias]),
    crearElemento("ul", { clase: "calendario__leyenda" }, [
      crearElemento("li", { clase: "leyenda leyenda--libre", texto: `Disponible (desde ${reglas.diasAnticipacionNormal} días)` }),
      crearElemento("li", { clase: "leyenda leyenda--urgente", texto: `Con recargo del ${reglas.recargoUrgentePorcentaje}% (menos de ${reglas.diasAnticipacionNormal} días)` }),
      crearElemento("li", { clase: "leyenda leyenda--bloqueado", texto: "No disponible" }),
    ]),
  ]);
}

function crearHorarios() {
  const { fecha, hora } = estado.pedido;
  if (!fecha) return crearElemento("p", { clase: "ayuda", texto: "Elegí un día del calendario para ver los horarios de entrega." });

  const { reglas } = estado.catalogo.configuracion;
  const franjas = obtenerFranjasDelDia(fecha, estado.catalogo.entregas.horarios);
  const { urgente } = obtenerEstadoDia(fecha, estado.catalogo);

  const botones = franjas.map((franja) =>
    crearElemento("button", {
      clase: franja === hora ? "horario horario--elegido" : "horario",
      texto: franja,
      atributos: { type: "button", "aria-pressed": String(franja === hora), "data-clave": `hora-${franja}` },
      eventos: { click: () => elegirHora(franja) },
    })
  );

  return crearElemento("div", { clase: "horarios" }, [
    crearElemento("h3", { clase: "subtitulo", texto: `Horario de entrega, ${formatearFechaLarga(fecha)}` }),
    crearElemento("div", { clase: "horarios__grilla" }, botones),
    urgente
      ? crearElemento("p", {
          clase: "aviso aviso--info",
          texto: `Elegiste una fecha con menos de ${reglas.diasAnticipacionNormal} días de anticipación. Se suma un recargo del ${reglas.recargoUrgentePorcentaje}% sobre los productos.`,
        })
      : null,
  ]);
}

/* Entrega y datos */

function elegirZonaEnvio(zonaId) {
  estado.pedido.entrega.zonaId = zonaId;
  persistirBorrador();
  renderizarVistaActual();
}

function crearSeccionEntrega() {
  const { zonasEnvio } = estado.catalogo.entregas;
  const { zonaId, direccion } = estado.pedido.entrega;

  const opciones = zonasEnvio.map(({ id, nombre, descripcion, costo }) =>
    crearOpcion({
      grupo: "zona",
      valor: id,
      seleccionada: id === zonaId,
      titulo: nombre,
      detalle: descripcion,
      textoExtra: costo > 0 ? `+ ${formatearPrecio(costo)}` : "Sin cargo",
      alCambiar: () => elegirZonaEnvio(id),
    })
  );

  const campoDireccion =
    zonaId === "retiro"
      ? null
      : crearCampoTexto({
          id: "direccion",
          etiqueta: "Dirección de entrega (calle, número y barrio)",
          valor: direccion,
          autocompletar: "street-address",
          alEscribir: (texto) => {
            estado.pedido.entrega.direccion = texto;
            persistirBorrador();
            actualizarResumenPedido();
          },
        });

  return crearSeccion(3, "Retiro o envío", "El costo de envío se suma al total.", [
    crearElemento("div", { clase: "opciones opciones--zonas", atributos: { role: "radiogroup", "aria-label": "Retiro o envío" } }, opciones),
    campoDireccion,
  ]);
}

function crearSeccionDatos() {
  const { cliente } = estado.pedido;

  const actualizarCliente = (campo) => (texto) => {
    estado.pedido.cliente[campo] = texto;
    persistirBorrador();
  };

  return crearSeccion(4, "Tus datos", "Los usamos solo para identificar tu pedido.", [
    crearCampoTexto({ id: "nombre", etiqueta: "Nombre y apellido", valor: cliente.nombre, autocompletar: "name", alEscribir: actualizarCliente("nombre") }),
    crearCampoTexto({ id: "telefono", etiqueta: "Teléfono", valor: cliente.telefono, tipo: "tel", autocompletar: "tel", alEscribir: actualizarCliente("telefono") }),
    crearCampoTexto({ id: "notas", etiqueta: "Comentarios para el pedido (opcional)", valor: cliente.notas, esParrafo: true, alEscribir: actualizarCliente("notas") }),
  ]);
}

/* Resumen, validación y confirmación */

function crearResumenPedido() {
  const totales = calcularTotalesPedido(estado.pedido, estado.catalogo);
  const { reglas } = estado.catalogo.configuracion;
  const { items, fecha, hora } = estado.pedido;
  const esEdicion = estado.pedidoEnEdicionId !== null;

  const crearFila = (concepto, valor, claseFila = "") =>
    crearElemento("li", { clase: claseFila }, [
      crearElemento("span", { texto: concepto }),
      crearElemento("span", { clase: "resumen__monto", texto: valor }),
    ]);

  const filas = [crearFila("Productos", formatearPrecio(totales.subtotal))];
  if (totales.esUrgente) filas.push(crearFila(`Recargo por urgencia (${reglas.recargoUrgentePorcentaje}%)`, formatearPrecio(totales.recargoUrgente)));
  filas.push(crearFila("Envío", totales.envio > 0 ? formatearPrecio(totales.envio) : "Sin cargo"));

  return crearElemento("aside", { clase: "resumen", atributos: { id: "resumenPedido", "aria-label": "Resumen del pedido" } }, [
    crearElemento("h2", { texto: "Resumen" }),
    crearElemento("p", { clase: "resumen__gluten", texto: items.length > 0 ? describirConteoGluten(items) : "Todavía no agregaste productos" }),
    fecha && hora ? crearElemento("p", { clase: "resumen__fecha", texto: `Entrega: ${formatearFechaLarga(fecha)}, ${hora}` }) : null,
    crearElemento("ul", { clase: "resumen__lista" }, filas),
    crearElemento("p", { clase: "resumen__total" }, [
      crearElemento("span", { texto: "Total" }),
      crearElemento("strong", { texto: formatearPrecio(totales.total) }),
    ]),
    crearElemento("button", {
      clase: "boton boton--principal boton--ancho",
      texto: esEdicion ? "Guardar cambios" : "Confirmar pedido",
      atributos: { type: "button", "data-clave": "confirmar-pedido" },
      eventos: { click: confirmarPedido },
    }),
    crearElemento("button", {
      clase: "boton boton--enlace",
      texto: esEdicion ? "Descartar cambios" : "Vaciar pedido",
      atributos: { type: "button" },
      eventos: { click: esEdicion ? descartarEdicion : vaciarPedidoEnCurso },
    }),
  ]);
}

function actualizarResumenPedido() {
  const resumenActual = document.getElementById("resumenPedido");
  if (resumenActual) resumenActual.replaceWith(crearResumenPedido());
}

function validarPedido() {
  const { items, fecha, hora, entrega, cliente } = estado.pedido;
  const errores = {};

  if (items.length === 0) errores.items = "Agregá al menos un producto a tu pedido.";

  if (!fecha) {
    errores.fecha = "Elegí un día de entrega.";
  } else if (!obtenerEstadoDia(fecha, estado.catalogo).disponible) {
    errores.fecha = "Ese día ya no está disponible. Elegí otro.";
  }

  if (fecha && !hora) errores.hora = "Elegí un horario de entrega.";
  if (entrega.zonaId !== "retiro" && entrega.direccion.trim().length < 5) errores.direccion = "Ingresá la dirección de entrega.";
  if (cliente.nombre.trim().length < 3) errores.nombre = "Escribí tu nombre y apellido.";
  if (cliente.telefono.replace(EXPRESION_DIGITOS, "").length < 8) errores.telefono = "Ingresá un teléfono de al menos 8 dígitos.";

  return errores;
}

function mostrarErroresPedido(errores) {
  ["items", "fecha", "hora", "direccion", "nombre", "telefono"].forEach((campo) => {
    const contenedorError = document.getElementById(`error-${campo}`);
    if (contenedorError) contenedorError.textContent = errores[campo] || "";
  });

  const primerCampoConError = ["items", "fecha", "hora", "direccion", "nombre", "telefono"].find((campo) => errores[campo]);
  if (!primerCampoConError) return;

  const destino = document.getElementById(`error-${primerCampoConError}`);
  destino.scrollIntoView({ behavior: "smooth", block: "center" });

  const entrada = document.getElementById(primerCampoConError);
  if (entrada) entrada.focus({ preventScroll: true });
}

function construirDatosPedido(totales) {
  const { items, fecha, hora, entrega, cliente } = estado.pedido;
  const zona = estado.catalogo.entregas.zonasEnvio.find(({ id }) => id === entrega.zonaId);

  return {
    items: structuredClone(items),
    fecha,
    hora,
    entrega: {
      zonaId: zona.id,
      zonaNombre: zona.nombre,
      costo: zona.costo,
      direccion: entrega.zonaId === "retiro" ? "" : entrega.direccion.trim(),
    },
    cliente: { nombre: cliente.nombre.trim(), telefono: cliente.telefono.trim(), notas: cliente.notas.trim() },
    totales,
  };
}

async function confirmarPedido() {
  const errores = validarPedido();
  mostrarErroresPedido(errores);

  if (Object.keys(errores).length > 0) {
    mostrarAviso("Revisá los datos marcados antes de confirmar.", "error");
    return;
  }

  const { telefono } = estado.catalogo.configuracion.negocio;
  const totales = calcularTotalesPedido(estado.pedido, estado.catalogo);
  const esEdicion = estado.pedidoEnEdicionId !== null;
  const { items, fecha, hora } = estado.pedido;
  const resumenGluten = describirConteoGluten(items);

  const confirmado = await pedirConfirmacion({
    titulo: esEdicion ? "¿Guardar los cambios?" : "¿Confirmás tu pedido?",
    texto: `${formatearFechaLarga(fecha)} a las ${hora}. ${resumenGluten}. Total: ${formatearPrecio(totales.total)}.`,
    textoConfirmar: esEdicion ? "Guardar cambios" : "Confirmar pedido",
  });
  if (!confirmado) return;

  const datosPedido = construirDatosPedido(totales);
  const idPedido = esEdicion ? estado.pedidoEnEdicionId : generarCodigoPedido();

  if (esEdicion) {
    modificarPedido(idPedido, datosPedido);
  } else {
    guardarPedido({ id: idPedido, creadoEn: new Date().toISOString(), ...datosPedido });
  }

  reiniciarPedido();
  actualizarContadorPedido();
  navegarA("/mis-pedidos");

  await Swal.fire({
    icon: "success",
    title: esEdicion ? "Pedido actualizado" : "¡Pedido confirmado!",
    text: `Tu código es ${idPedido}. ${resumenGluten}. Ante cualquier duda, comunicate al ${formatearTelefono(telefono)}.`,
    confirmButtonText: "Entendido",
    confirmButtonColor: COLORES_AVISO.exito,
  });
}

async function vaciarPedidoEnCurso() {
  if (estado.pedido.items.length === 0) {
    mostrarAviso("Tu pedido ya está vacío.", "info");
    return;
  }

  const confirmado = await pedirConfirmacion({
    titulo: "¿Vaciar tu pedido?",
    texto: "Vamos a quitar todos los productos, la fecha y los datos que cargaste.",
    textoConfirmar: "Vaciar pedido",
    esPeligro: true,
  });
  if (!confirmado) return;

  reiniciarPedido();
  actualizarContadorPedido();
  renderizarVistaActual();
  mostrarAviso("Vaciaste tu pedido.", "info");
}

function descartarEdicion() {
  reiniciarPedido();
  actualizarContadorPedido();
  navegarA("/mis-pedidos");
  mostrarAviso("Descartaste los cambios. Tu pedido sigue como estaba.", "info");
}

function renderizarVistaPedido() {
  const { items } = estado.pedido;
  const esEdicion = estado.pedidoEnEdicionId !== null;

  const avisoEdicion = esEdicion
    ? crearElemento("p", { clase: "aviso aviso--info", texto: `Estás modificando el pedido ${estado.pedidoEnEdicionId}.` })
    : null;

  if (items.length === 0) {
    elementos.contenido.replaceChildren(
      crearElemento("section", { clase: "vista vista--angosta" }, [
        crearElemento("h1", { texto: "Tu pedido" }),
        avisoEdicion,
        crearElemento("div", { clase: "vacio vacio--grande" }, [
          crearElemento("p", { texto: "Todavía no agregaste nada. Elegí qué querés pedir." }),
          crearElemento("div", { clase: "acciones" }, [
            crearElemento("a", { clase: "boton boton--principal", texto: "Tortas con gluten", atributos: { href: "#/tortas/con-gluten" } }),
            crearElemento("a", { clase: "boton boton--secundario", texto: "Tortas sin gluten", atributos: { href: "#/tortas/sin-gluten" } }),
            crearElemento("a", { clase: "boton boton--secundario", texto: "Otras opciones", atributos: { href: "#/otras-opciones" } }),
          ]),
        ]),
      ])
    );
    return;
  }

  const seccionItems = crearSeccion(1, "Lo que pediste", null, [
    crearElemento("div", { clase: "items" }, items.map(crearItemPedido)),
    crearElemento("p", { clase: "campo__error", atributos: { id: "error-items" } }),
  ]);

  const seccionFecha = crearSeccion(2, "Fecha y horario de entrega", "Los domingos descansamos. El último horario de entrega es el sábado a las 20:00.", [
    crearCalendario(),
    crearElemento("p", { clase: "campo__error", atributos: { id: "error-fecha" } }),
    crearHorarios(),
    crearElemento("p", { clase: "campo__error", atributos: { id: "error-hora" } }),
  ]);

  elementos.contenido.replaceChildren(
    crearElemento("div", { clase: "vista" }, [
      crearElemento("h1", { texto: "Tu pedido" }),
      avisoEdicion,
      crearElemento("div", { clase: "configurador" }, [
        crearElemento("div", { clase: "configurador__pasos" }, [seccionItems, seccionFecha, crearSeccionEntrega(), crearSeccionDatos()]),
        crearResumenPedido(),
      ]),
    ])
  );
}

/* ---------- Vista: mis pedidos ---------- */

function iniciarEdicionPedido(idPedido) {
  const pedidoGuardado = obtenerPedidos().find(({ id }) => id === idPedido);
  if (!pedidoGuardado) return;

  const { items, fecha, hora, entrega, cliente } = pedidoGuardado;
  const fechaSigueDisponible = obtenerEstadoDia(fecha, estado.catalogo).disponible;

  estado.pedidoEnEdicionId = idPedido;
  estado.pedido = {
    items: structuredClone(items),
    fecha: fechaSigueDisponible ? fecha : "",
    hora: fechaSigueDisponible ? hora : "",
    entrega: { zonaId: entrega.zonaId, direccion: entrega.direccion },
    cliente: { ...cliente },
  };
  estado.mesCalendario = obtenerMesInicial();
  persistirBorrador();

  navegarA("/pedido");
  mostrarAviso(
    fechaSigueDisponible ? "Modificá lo que necesites y guardá los cambios." : "La fecha original ya no está disponible. Elegí una nueva.",
    "info"
  );
}

async function cancelarPedido(idPedido) {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Cancelar este pedido?",
    texto: "Vamos a quitarlo de tus pedidos. No se puede deshacer.",
    textoConfirmar: "Cancelar pedido",
    esPeligro: true,
  });
  if (!confirmado) return;

  eliminarPedido(idPedido);
  if (estado.pedidoEnEdicionId === idPedido) reiniciarPedido();
  renderizarVistaActual();
  mostrarAviso("Cancelaste el pedido.", "info");
}

async function vaciarTodosLosPedidos() {
  const confirmado = await pedirConfirmacion({
    titulo: "¿Vaciar todos tus pedidos?",
    texto: "Vamos a borrar todos los pedidos guardados y el pedido en curso. No se puede deshacer.",
    textoConfirmar: "Vaciar todo",
    esPeligro: true,
  });
  if (!confirmado) return;

  vaciarAlmacenamiento();
  estado.pedido = crearPedidoVacio();
  estado.pedidoEnEdicionId = null;
  estado.mesCalendario = obtenerMesInicial();
  actualizarContadorPedido();
  renderizarVistaActual();
  mostrarAviso("Se vaciaron todos tus pedidos.", "info");
}

function crearFilaTotal(concepto, valor) {
  return crearElemento("div", { clase: "detalle__fila" }, [
    crearElemento("dt", { texto: concepto }),
    crearElemento("dd", { texto: valor }),
  ]);
}

function crearTarjetaPedido(pedido) {
  const { id, fecha, hora, items, entrega, cliente, totales } = pedido;

  const listaItems = items.map(({ gluten, cantidad, nombre, detalle }) =>
    crearElemento("li", { clase: "pedido__item" }, [
      crearInsigniaGluten(gluten),
      crearElemento("strong", { texto: `${cantidad > 1 ? `${cantidad} x ` : ""}${nombre}` }),
      detalle ? crearElemento("ul", { clase: "item__detalle" }, detalle.map((linea) => crearElemento("li", { texto: linea }))) : null,
    ])
  );

  const textoEntrega = entrega.direccion ? `${entrega.zonaNombre}, ${entrega.direccion}` : entrega.zonaNombre;
  const filasTotales = [crearFilaTotal("Productos", formatearPrecio(totales.subtotal))];
  if (totales.esUrgente) filasTotales.push(crearFilaTotal("Recargo por urgencia", formatearPrecio(totales.recargoUrgente)));
  filasTotales.push(crearFilaTotal("Envío", totales.envio > 0 ? formatearPrecio(totales.envio) : "Sin cargo"));

  return crearElemento("article", { clase: "pedido" }, [
    crearElemento("header", { clase: "pedido__encabezado" }, [
      crearElemento("h3", { texto: `${formatearFechaLarga(fecha)}, ${hora}` }),
      crearElemento("p", { clase: "pedido__codigo", texto: `Código ${id}` }),
    ]),
    crearElemento("ul", { clase: "pedido__items" }, listaItems),
    crearElemento("dl", { clase: "detalle" }, [
      crearFilaTotal("Entrega", textoEntrega),
      crearFilaTotal("A nombre de", `${cliente.nombre}, ${cliente.telefono}`),
      crearFilaTotal("Comentarios", cliente.notas || "Sin comentarios"),
      ...filasTotales,
      crearElemento("div", { clase: "detalle__fila detalle__fila--total" }, [
        crearElemento("dt", { texto: "Total" }),
        crearElemento("dd", { texto: formatearPrecio(totales.total) }),
      ]),
    ]),
    crearElemento("div", { clase: "pedido__acciones" }, [
      crearElemento("button", {
        clase: "boton boton--secundario",
        texto: "Modificar",
        atributos: { type: "button", "aria-label": `Modificar el pedido ${id}` },
        eventos: { click: () => iniciarEdicionPedido(id) },
      }),
      crearElemento("button", {
        clase: "boton boton--peligro",
        texto: "Cancelar pedido",
        atributos: { type: "button", "aria-label": `Cancelar el pedido ${id}` },
        eventos: { click: () => cancelarPedido(id) },
      }),
    ]),
  ]);
}

function renderizarVistaMisPedidos() {
  const pedidos = [...obtenerPedidos()].sort((pedidoAnterior, pedidoSiguiente) =>
    `${pedidoAnterior.fecha} ${pedidoAnterior.hora}`.localeCompare(`${pedidoSiguiente.fecha} ${pedidoSiguiente.hora}`)
  );

  const botonVaciar =
    pedidos.length > 0
      ? crearElemento("button", {
          clase: "boton boton--peligro",
          texto: "Vaciar todos mis pedidos",
          atributos: { type: "button" },
          eventos: { click: vaciarTodosLosPedidos },
        })
      : null;

  const contenido =
    pedidos.length === 0
      ? crearElemento("div", { clase: "vacio vacio--grande" }, [
          crearElemento("p", { texto: "Todavía no confirmaste ningún pedido. Cuando lo hagas, lo vas a ver acá." }),
          crearElemento("a", { clase: "boton boton--principal", texto: "Elegir qué pedir", atributos: { href: "#/" } }),
        ])
      : crearElemento("div", { clase: "pedidos" }, pedidos.map(crearTarjetaPedido));

  elementos.contenido.replaceChildren(
    crearElemento("section", { clase: "vista" }, [
      crearElemento("div", { clase: "vista__encabezado" }, [crearElemento("h1", { texto: "Mis pedidos" }), botonVaciar]),
      contenido,
    ])
  );
}

/* ---------- Inicio de la aplicación ---------- */

async function iniciarAplicacion() {
  elementos.pantallaCarga.hidden = false;

  try {
    estado.catalogo = await cargarCatalogo();
    estado.mensajeErrorCarga = "";
    restaurarBorrador();
    estado.mesCalendario = obtenerMesInicial();
    enrutar();
  } catch (error) {
    estado.mensajeErrorCarga = error.message;
    enrutar();
    mostrarAviso("No se pudieron cargar los datos.", "error");
  } finally {
    elementos.pantallaCarga.hidden = true;
  }
}

window.addEventListener("hashchange", enrutar);
iniciarAplicacion();
