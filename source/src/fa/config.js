/* Function Analysis Workbench — offline editor for function structures.
   One JSON document holds a catalogue of functions and several variants of the structure
   (each with its own system boundary, decomposition, externals and flows). */
/* global cytoscape, ELK */
"use strict";

/* ================= Constants ================= */
const APP_VERSION = "1.0";
const MODE = "fa"; // this tool, for the mode switcher (it holds two modes: system and functions)
const FONT_PX = 13, LINE = 17, MAXW = 150, PADX = 11, PADY = 8;
const FONT_STACK = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const LS_DOC = "function-analysis:doc", LS_VIEW = "function-analysis:view", LS_FILE = "function-analysis:file";
// names the shared core uses for this tool
const FILE_DESC = "Function analysis file";
const FILE_OPEN_TYPE = { description: "Function analysis file", accept: { "application/json": [".json"] } };
const TAG_HOLDER = ["item", "items"];

/* Box colours by level of decomposition. Level 0 is the overall function, drawn as the system boundary. */
const DEFAULT_LEVELS = [
  { fill: "#E9F3EE", stroke: "#0E6B4E", font: "#10261D" },
  { fill: "#0E6B4E", stroke: "#08402F", font: "#FFFFFF" },
  { fill: "#3E9A78", stroke: "#1F6B50", font: "#FFFFFF" },
  { fill: "#9ED3BC", stroke: "#4E9C7C", font: "#10261D" },
  { fill: "#D6EEE3", stroke: "#7DB89D", font: "#10261D" },
  { fill: "#F3FAF6", stroke: "#A9CFBC", font: "#10261D" },
];
/* The three classic flows of a function structure (Pahl & Beitz; Stone & Wood). Colour and line pattern both
   carry the type, so diagrams still read in black and white. */
const FLOW_STYLES = { solid: "Solid", dashed: "Dashed", dotted: "Dotted", dashdot: "Dash-dot" };
const FLOW_GAP = 5; // px of space between dashes or dots, unless the flow type sets its own
/* the on/off lengths of a flow type's line. Lines have round caps, so a dot is a dash of length ~0 and every gap
   gets the line width added back; the same pattern draws the canvas, the legend and the exports */
function dashPattern(t, w = t.width) {
  const g = (Number.isFinite(+t.gap) ? +t.gap : FLOW_GAP) + w, dash = Math.max(6, w * 3);
  return t.style === "dashed" ? [dash, g] : t.style === "dotted" ? [0.01, g] : t.style === "dashdot" ? [dash, g, 0.01, g] : null;
}
const dashAttr = (t, w) => { const p = dashPattern(t, w); return p ? ` stroke-dasharray="${p.map(v => +v.toFixed(2)).join(" ")}" stroke-linecap="round"` : ""; };
const DEFAULT_FLOW_TYPES = [
  { id: "material", name: "Material", nameTr: { es: "Material" }, color: "#1F6FB2", style: "solid", width: 2.6, desc: "Matter that moves or changes: fruit, water, air, packaging, inoculum" },
  { id: "energy", name: "Energy", nameTr: { es: "Energía" }, color: "#D9822B", style: "dashed", width: 2.2, desc: "Heat, cold, mechanical or electrical energy" },
  { id: "signal", name: "Signal", nameTr: { es: "Señal" }, color: "#7A4FBF", style: "dotted", width: 2, desc: "Information: measurements, records, decisions, messages" },
];
const UNWANTED_COLOR = "#C0392B";
const AUX_BORDER = { style: "double", width: 5 };

/* Function verbs, used to check that a box names a function ("verb + noun") rather than a solution, and to suggest verbs
   while typing. Each row is one term of the functional basis (Hirtz et al. 2002, secondary and tertiary level): the first
   word is the term, the rest are synonyms, mostly from the paper's "correspondents" column (machining-only ones left out),
   plus everyday verbs of postharvest and systems analysis. The last row has common verbs with no single basis term.
   British and American spellings both count. The Spanish rows are a working translation. */
const VERB_ROWS = [
  // Branch
  { en: "separate isolate sever disjoin detach disconnect segregate", es: "separar aislar desunir desprender desconectar segregar apartar" },
  { en: "divide split subtract partition fractionate", es: "dividir partir fraccionar repartir" },
  { en: "extract refine filter purify percolate strain clear drain", es: "extraer refinar filtrar purificar colar depurar drenar" },
  { en: "remove eliminate cut strip discard reject withdraw evacuate clear", es: "retirar remover eliminar quitar cortar descartar rechazar evacuar" },
  { en: "distribute scatter disperse diffuse dispel spread dissipate", es: "distribuir dispersar difundir esparcir disipar" },
  // Channel
  { en: "import input capture receive admit intake", es: "importar ingresar recibir admitir captar" },
  { en: "export dispose eject emit empty expel discharge release dispatch ship send", es: "exportar desechar expulsar emitir vaciar descargar liberar despachar enviar embarcar" },
  { en: "transfer pass hand", es: "transferir traspasar pasar" },
  { en: "transport lift move carry convey haul load unload", es: "transportar mover levantar llevar acarrear cargar" },
  { en: "transmit conduct relay broadcast", es: "transmitir conducir retransmitir" },
  { en: "guide direct steer route channel divert switch", es: "guiar dirigir encauzar canalizar desviar conmutar" },
  { en: "translate relocate shift", es: "trasladar reubicar desplazar" },
  { en: "rotate spin turn tumble", es: "rotar girar voltear" },
  { en: "allow permit enable unlock release", es: "permitir habilitar desbloquear" },
  // Connect
  { en: "couple associate connect", es: "acoplar asociar conectar" },
  { en: "join assemble fasten unite", es: "unir ensamblar juntar" },
  { en: "link attach bind", es: "vincular enlazar adjuntar ligar" },
  { en: "mix add blend combine coalesce stir", es: "mezclar añadir agregar combinar incorporar" },
  // Control magnitude
  { en: "actuate enable initiate start trigger activate", es: "accionar iniciar activar arrancar disparar" },
  { en: "regulate control equalize equalise limit maintain adjust manage balance govern", es: "regular controlar igualar limitar mantener ajustar gestionar manejar equilibrar" },
  { en: "increase raise open boost maximize maximise", es: "aumentar elevar subir abrir maximizar" },
  { en: "decrease lower reduce close delay interrupt slow", es: "disminuir bajar reducir cerrar retrasar retardar interrumpir" },
  { en: "change adjust modulate vary modify alter adapt invert normalize normalise reset scale", es: "cambiar modular variar modificar alterar adaptar invertir normalizar escalar" },
  { en: "increment amplify enhance magnify multiply improve strengthen intensify", es: "incrementar amplificar potenciar magnificar multiplicar mejorar fortalecer reforzar intensificar" },
  { en: "decrement attenuate dampen minimize minimise lessen mitigate weaken", es: "decrementar atenuar amortiguar minimizar aminorar mitigar debilitar ralentizar" },
  { en: "shape form mould mold compact compress crush pierce deform", es: "conformar formar moldear compactar comprimir triturar perforar deformar" },
  { en: "condition prepare treat cure ripen wash sanitize sanitise disinfect", es: "acondicionar preparar tratar curar madurar lavar sanitizar desinfectar" },
  { en: "stop end halt pause restrain block arrest kill", es: "detener terminar parar pausar frenar bloquear contener matar" },
  { en: "prevent avoid impede preclude exclude disable", es: "prevenir evitar impedir excluir deshabilitar" },
  { en: "inhibit shield insulate protect resist suppress repel", es: "inhibir blindar proteger resistir suprimir repeler" },
  // Convert
  { en: "convert transform create generate process condense evaporate liquefy solidify encode decode integrate differentiate heat warm cool chill freeze dry", es: "convertir transformar crear generar procesar condensar evaporar licuar solidificar codificar decodificar integrar calentar templar enfriar refrigerar congelar secar deshidratar" },
  // Provision
  { en: "store contain collect reserve capture accumulate hold keep preserve retain gather", es: "almacenar contener recolectar reservar capturar acumular guardar conservar retener reunir" },
  { en: "supply provide fill replenish expose feed deliver furnish", es: "suministrar proveer llenar reponer exponer alimentar entregar abastecer" },
  // Signal
  { en: "sense perceive recognize recognise discern check locate verify", es: "percibir reconocer discernir comprobar localizar verificar sensar" },
  { en: "detect identify find spot screen diagnose", es: "detectar identificar hallar encontrar diagnosticar" },
  { en: "measure quantify estimate assess evaluate sample test monitor gauge", es: "medir cuantificar estimar evaluar muestrear probar monitorear monitorizar" },
  { en: "indicate announce show denote signal record register report notify inform warn alert label", es: "indicar anunciar señalar denotar registrar reportar notificar informar avisar alertar etiquetar" },
  { en: "track mark time trace follow", es: "rastrear marcar cronometrar trazar seguir" },
  { en: "display present exhibit visualize visualise", es: "mostrar presentar exhibir visualizar" },
  { en: "process compare calculate compute analyse analyze decide predict forecast plan schedule coordinate", es: "procesar comparar calcular computar analizar decidir predecir pronosticar planificar programar coordinar" },
  // Support
  { en: "stabilize stabilise steady", es: "estabilizar afianzar" },
  { en: "secure attach mount lock fasten hold fix", es: "asegurar fijar montar sujetar trabar" },
  { en: "position align install locate orient place arrange", es: "posicionar alinear instalar ubicar orientar colocar disponer" },
  // everyday verbs with no single basis term
  { en: "* keep maintain ensure assure guarantee support enable facilitate deliver communicate share clean sort grade select classify pack package wrap seal cover inspect harvest pick ventilate aerate humidify dehumidify optimize optimise manage train", es: "* mantener asegurar garantizar soportar facilitar entregar comunicar compartir limpiar clasificar seleccionar empacar embalar envolver sellar cubrir inspeccionar cosechar recolectar ventilar airear humidificar deshumidificar optimizar gestionar capacitar" },
];

const DEFAULT_VIEW = { mode: "functions", lang: null, depth: "all", flowType: "material", legendOpen: true, tagChips: true, labels: true };

/* The steps of the method, in order. `auto` steps are ticked when the diagram shows they are done. */
const STEPS = [
  { id: "boundary", name: "Set the system boundary", help: "Say where the system starts and ends, and what is inside and outside. Moving the boundary is one way to make a new variant." },
  { id: "blackbox", name: "Describe the black box", help: "Name the overall function (verb + noun) and draw the flows that cross the boundary: material, energy and signals in and out, wanted and unwanted." },
  { id: "decompose", name: "Decompose into subfunctions", help: "Ask “how?” to go one level down. Stop when the next level would name a solution. Connect the subfunctions with flows." },
  { id: "wording", name: "Check the wording", help: "Each function should be a verb + noun that more than one solution could fulfil. If only one technology fits, it is a means, not a function." },
  { id: "auxiliary", name: "Add auxiliary functions", help: "The ones nobody thinks of: clean, record, communicate back, protect. Mark them as auxiliary; they get a double border." },
  { id: "variants", name: "Make variants", help: "A problem never leads to one function structure. Move the boundary, reorder subfunctions, split or merge them, and compare." },
];
