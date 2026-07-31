/* ============================================================
   Bancorithmics — Utilidades de interfaz (Bank)
   ------------------------------------------------------------
   Todo lo que comparten las páginas: formato de dinero y fechas,
   notificaciones, modales accesibles, confirmaciones, menú lateral,
   tema claro/oscuro e iconos.
   ============================================================ */
(function (global) {
    'use strict';

    var MONEDAS = {
        COP: { simbolo: '$', locale: 'es-CO' },
        MXN: { simbolo: '$', locale: 'es-MX' },
        ARS: { simbolo: '$', locale: 'es-AR' },
        CLP: { simbolo: '$', locale: 'es-CL' },
        PEN: { simbolo: 'S/', locale: 'es-PE' },
        USD: { simbolo: 'US$', locale: 'en-US' },
        EUR: { simbolo: '€', locale: 'es-ES' }
    };

    var MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    var MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    function config() {
        var perfil = (global.Store && global.Store.estado().perfil) || {};
        return MONEDAS[perfil.moneda] || MONEDAS.COP;
    }

    /* ---------- Formato ---------- */

    /* $1.250.000 */
    function fmt(valor) {
        var c = config();
        var n = Math.round(Number(valor) || 0);
        var signo = n < 0 ? '-' : '';
        return signo + c.simbolo + Math.abs(n).toLocaleString(c.locale, { maximumFractionDigits: 0 });
    }

    /* +$1.250.000 / -$150.000 */
    function fmtSigno(valor, esIngreso) {
        return (esIngreso ? '+' : '-') + fmt(Math.abs(valor));
    }

    /* $1,2M — para ejes de gráficas y espacios estrechos */
    function fmtCorto(valor) {
        var c = config();
        var n = Math.round(Number(valor) || 0);
        var abs = Math.abs(n);
        var signo = n < 0 ? '-' : '';
        if (abs >= 1000000) return signo + c.simbolo + (abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace('.', ',') + 'M';
        if (abs >= 1000) return signo + c.simbolo + Math.round(abs / 1000) + 'k';
        return signo + c.simbolo + abs;
    }

    /* '2026-07-24' -> '24 Jul' | '24 Jul 2026' | '24 de julio de 2026' */
    function fecha(iso, formato) {
        if (!iso) return '';
        var partes = String(iso).slice(0, 10).split('-');
        var anio = Number(partes[0]);
        var mes = Number(partes[1]) - 1;
        var dia = Number(partes[2]);
        if (isNaN(dia) || isNaN(mes)) return '';
        if (formato === 'largo') return dia + ' de ' + MESES_LARGOS[mes].toLowerCase() + ' de ' + anio;
        if (formato === 'corto') return dosDigitos(dia) + ' ' + MESES_CORTOS[mes];
        return dosDigitos(dia) + ' ' + MESES_CORTOS[mes] + ' ' + anio;
    }

    /* 'YYYY-MM' -> 'Julio 2026' */
    function nombreMes(clave, corto) {
        var partes = String(clave).split('-');
        var mes = Number(partes[1]) - 1;
        if (isNaN(mes) || mes < 0 || mes > 11) return clave;
        return (corto ? MESES_CORTOS[mes] : MESES_LARGOS[mes]) + ' ' + partes[0];
    }

    function dosDigitos(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function hoyISO() {
        var d = new Date();
        return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) + '-' + dosDigitos(d.getDate());
    }

    /* Texto seguro para insertar con innerHTML */
    function esc(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function porcentaje(parte, total) {
        if (!total || total <= 0) return 0;
        return Math.min(100, Math.round((parte / total) * 100));
    }

    /* ---------- Entradas de dinero con separador de miles ---------- */

    function soloDigitos(texto) {
        return String(texto || '').replace(/\D/g, '');
    }

    /* Convierte lo escrito en el input a un número */
    function leerMonto(input) {
        if (!input) return 0;
        var digitos = soloDigitos(input.value);
        return digitos ? parseInt(digitos, 10) : 0;
    }

    function escribirMonto(input, valor) {
        if (!input) return;
        var n = Math.round(Number(valor) || 0);
        input.value = n > 0 ? n.toLocaleString(config().locale, { maximumFractionDigits: 0 }) : '';
    }

    /* Formatea mientras se escribe y conserva la posición del cursor */
    function mascaraMonto(input) {
        if (!input || input.dataset.mascara === 'si') return;
        input.dataset.mascara = 'si';
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'off');

        input.addEventListener('input', function () {
            var cursor = input.selectionStart;
            var digitosAntes = soloDigitos(input.value.slice(0, cursor)).length;
            var digitos = soloDigitos(input.value).slice(0, 12);

            input.value = digitos ? parseInt(digitos, 10).toLocaleString(config().locale) : '';

            /* Recolocamos el cursor tras la misma cantidad de dígitos */
            var vistos = 0, posicion = input.value.length;
            for (var i = 0; i < input.value.length; i++) {
                if (/\d/.test(input.value[i])) vistos++;
                if (vistos === digitosAntes) { posicion = i + 1; break; }
            }
            if (digitosAntes === 0) posicion = 0;
            try { input.setSelectionRange(posicion, posicion); } catch (e) { /* inputs sin soporte */ }
        });
    }

    /* ---------- Notificaciones ---------- */

    function contenedorToasts() {
        var caja = document.getElementById('toast-container');
        if (!caja) {
            caja = document.createElement('div');
            caja.id = 'toast-container';
            caja.className = 'toast-container';
            caja.setAttribute('role', 'status');
            caja.setAttribute('aria-live', 'polite');
            document.body.appendChild(caja);
        }
        return caja;
    }

    var ICONO_TOAST = {
        exito: '<path d="M20 6L9 17l-5-5"/>',
        error: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    function toast(mensaje, tipo) {
        var caja = contenedorToasts();
        var clase = tipo || 'info';
        var elemento = document.createElement('div');
        elemento.className = 'toast toast-' + clase;
        elemento.innerHTML =
            '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' + (ICONO_TOAST[clase] || ICONO_TOAST.info) + '</svg>' +
            '<span>' + esc(mensaje) + '</span>';
        caja.appendChild(elemento);

        /* Animación de entrada */
        requestAnimationFrame(function () { elemento.classList.add('visible'); });

        var salir = function () {
            elemento.classList.remove('visible');
            setTimeout(function () {
                if (elemento.parentNode) elemento.parentNode.removeChild(elemento);
            }, 250);
        };
        var temporizador = setTimeout(salir, 3200);
        elemento.addEventListener('click', function () {
            clearTimeout(temporizador);
            salir();
        });
    }

    /* ---------- Modales ---------- */

    var modalesAbiertos = [];

    function abrirModal(elemento) {
        if (typeof elemento === 'string') elemento = document.getElementById(elemento);
        if (!elemento) return;

        elemento._elementoPrevio = document.activeElement;
        elemento.hidden = false;
        document.body.classList.add('sin-scroll');
        modalesAbiertos.push(elemento);

        requestAnimationFrame(function () { elemento.classList.add('visible'); });

        /* Enfocamos el primer campo útil del modal */
        var enfocable = elemento.querySelector('input:not([type=hidden]), select, textarea, button.btn-action');
        if (enfocable) setTimeout(function () { enfocable.focus(); }, 60);
    }

    function cerrarModal(elemento) {
        if (typeof elemento === 'string') elemento = document.getElementById(elemento);
        if (!elemento || elemento.hidden) return;

        elemento.classList.remove('visible');
        var indice = modalesAbiertos.indexOf(elemento);
        if (indice > -1) modalesAbiertos.splice(indice, 1);
        if (!modalesAbiertos.length) document.body.classList.remove('sin-scroll');

        setTimeout(function () {
            elemento.hidden = true;
            if (elemento._elementoPrevio && elemento._elementoPrevio.focus) {
                elemento._elementoPrevio.focus();
            }
        }, 180);
    }

    function cerrarModalSuperior() {
        if (modalesAbiertos.length) cerrarModal(modalesAbiertos[modalesAbiertos.length - 1]);
    }

    /* Cierre por Escape, clic en el fondo y botones [data-close-modal] */
    function prepararCierresGlobales() {
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') cerrarModalSuperior();
            if (evento.key === 'Tab' && modalesAbiertos.length) atraparTabulacion(evento);
        });

        document.addEventListener('click', function (evento) {
            if (evento.target.classList && evento.target.classList.contains('modal-overlay')) {
                cerrarModal(evento.target);
                return;
            }
            var boton = evento.target.closest && evento.target.closest('[data-close-modal]');
            if (boton) {
                var overlay = boton.closest('.modal-overlay');
                if (overlay) cerrarModal(overlay);
            }
        });
    }

    function atraparTabulacion(evento) {
        var modal = modalesAbiertos[modalesAbiertos.length - 1];
        var focos = modal.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])');
        var visibles = Array.prototype.filter.call(focos, function (el) {
            return el.offsetParent !== null;
        });
        if (!visibles.length) return;

        var primero = visibles[0];
        var ultimo = visibles[visibles.length - 1];
        if (evento.shiftKey && document.activeElement === primero) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primero.focus();
        }
    }

    /* ---------- Confirmación ---------- */

    function confirmar(opciones) {
        var opts = opciones || {};
        return new Promise(function (resolver) {
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay modal-confirm';
            overlay.innerHTML =
                '<div class="modal modal-sm" role="dialog" aria-modal="true">' +
                '<div class="confirm-body">' +
                '<div class="confirm-icon ' + (opts.peligro ? 'peligro' : 'aviso') + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                '<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>' +
                '</svg></div>' +
                '<h2>' + esc(opts.titulo || '¿Confirmas la acción?') + '</h2>' +
                '<p>' + esc(opts.mensaje || '') + '</p>' +
                '</div>' +
                '<div class="confirm-acciones">' +
                '<button class="btn-secundario" data-respuesta="no">' + esc(opts.textoCancelar || 'Cancelar') + '</button>' +
                '<button class="btn-action ' + (opts.peligro ? 'btn-peligro' : '') + '" data-respuesta="si">' + esc(opts.textoOk || 'Confirmar') + '</button>' +
                '</div>' +
                '</div>';

            document.body.appendChild(overlay);
            overlay.hidden = true;
            abrirModal(overlay);

            var terminar = function (respuesta) {
                cerrarModal(overlay);
                setTimeout(function () {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 220);
                resolver(respuesta);
            };

            overlay.addEventListener('click', function (evento) {
                var boton = evento.target.closest('[data-respuesta]');
                if (boton) return terminar(boton.dataset.respuesta === 'si');
                if (evento.target === overlay) terminar(false);
            });
        });
    }

    /* ---------- Iconos de bolsillos ---------- */

    var ICONOS_SVG = {
        bus: '<rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="6" cy="12" r="1.5" fill="currentColor"/><path d="M10 12h8"/>',
        comida: '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
        juego: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/>',
        rayo: '<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>',
        ahorro: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>',
        casa: '<path d="M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10z"/><path d="M9 22V12h6v10"/>',
        salud: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 10-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 000-7.8z"/>',
        estudio: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
        regalo: '<rect x="2" y="7" width="20" height="5" rx="1"/><path d="M4 12v9h16v-9"/><path d="M12 7v14"/><path d="M12 7S9 2 6.5 3.5 8 7 12 7z"/><path d="M12 7s3-5 5.5-3.5S16 7 12 7z"/>',
        avion: '<path d="M17.8 19.2L16 11l3.5-3.5a2.1 2.1 0 00-3-3L13 8 4.8 6.2a1 1 0 00-.9 1.7L9 11l-2 3H4l-1 2 3.5 1L8 21l2-1v-3l3-2 3.1 5.1a1 1 0 001.7-.9z"/>',
        maletin: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
        bolsa: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>',
        factura: '<path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
        grafico: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
        etiqueta: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-8-8A2 2 0 012 11.2V4a2 2 0 012-2h7.2a2 2 0 011.4.6l8 8a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/>'
    };

    /* Icono representativo de cada categoría */
    var ICONO_CATEGORIA = {
        trabajo: 'maletin',
        freelance: 'maletin',
        ventas: 'etiqueta',
        inversiones: 'grafico',
        regalo: 'regalo',
        'otros-ingreso': 'ahorro',
        alimentacion: 'comida',
        transporte: 'bus',
        servicios: 'factura',
        entretenimiento: 'juego',
        salud: 'salud',
        educacion: 'estudio',
        hogar: 'casa',
        compras: 'bolsa',
        'otros-egreso': 'etiqueta'
    };

    function iconoSVG(nombre, clase) {
        var trazo = ICONOS_SVG[nombre] || ICONOS_SVG.ahorro;
        return '<svg class="' + (clase || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + trazo + '</svg>';
    }

    function iconoCategoria(idCategoria) {
        return iconoSVG(ICONO_CATEGORIA[idCategoria] || 'etiqueta');
    }

    /* ---------- Menú lateral ---------- */

    var PAGINAS = [
        { archivo: 'index.html', etiqueta: 'Inicio', icono: '<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 10v7a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1v-7a1 1 0 00-.293-.707l-7-7z"/>' },
        { archivo: 'money.html', etiqueta: 'Ingresos y Egresos', icono: '<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>' },
        { archivo: 'bolsillos.html', etiqueta: 'Bolsillos', icono: '<path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>' },
        { archivo: 'colchon.html', etiqueta: 'Colchón', icono: '<path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>' },
        { archivo: 'reportes.html', etiqueta: 'Reportes', icono: '<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>' },
        { archivo: 'metas.html', etiqueta: 'Metas', icono: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10zm0-3a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>' },
        { archivo: 'configuracion.html', etiqueta: 'Configuración', icono: '<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.885.06 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>' }
    ];

    var LOGO = '<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="40" height="40" rx="10" fill="#22C55E"/>' +
        '<path d="M12 18h16a2 2 0 012 2v10a2 2 0 01-2 2H12a2 2 0 01-2-2V20a2 2 0 012-2z" fill="#fff"/>' +
        '<path d="M14 18v-2a6 6 0 1112 0v2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="28" cy="24" r="2" fill="#22C55E"/>' +
        '<path d="M22 28l2-3 2 2 3-4" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    function paginaActual() {
        var ruta = global.location.pathname.split('/').pop();
        return ruta || 'index.html';
    }

    function iniciales(nombre) {
        return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(function (p) {
            return p.charAt(0).toUpperCase();
        }).join('');
    }

    function pintarSidebar() {
        var contenedor = document.querySelector('.sidebar');
        if (!contenedor) return;

        var actual = paginaActual();
        var perfil = global.Store ? global.Store.estado().perfil : { nombre: 'Mi cuenta', avatar: '' };

        var enlaces = PAGINAS.map(function (pagina) {
            var activo = pagina.archivo === actual ? ' active' : '';
            return '<a href="' + pagina.archivo + '" class="nav-item' + activo + '"' +
                (activo ? ' aria-current="page"' : '') + '>' +
                '<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">' + pagina.icono + '</svg>' +
                pagina.etiqueta + '</a>';
        }).join('');

        var avatar = perfil.avatar
            ? '<img src="' + esc(perfil.avatar) + '" alt="" class="profile-avatar" onerror="this.style.display=\'none\'">'
            : '<div class="profile-avatar profile-avatar-letras">' + esc(iniciales(perfil.nombre)) + '</div>';

        contenedor.innerHTML =
            '<div class="sidebar-top">' +
            '<div class="brand">' +
            '<div class="brand-icon">' + LOGO + '</div>' +
            '<div class="brand-text">' +
            '<span class="brand-name">Bancorithmics</span>' +
            '<span class="brand-tagline">controla tu dinero, construye tu futuro.</span>' +
            '</div></div>' +
            '<nav class="sidebar-nav" aria-label="Navegación principal">' + enlaces + '</nav>' +
            '</div>' +
            '<a href="configuracion.html" class="sidebar-profile">' +
            avatar +
            '<div class="profile-info">' +
            '<span class="profile-name">' + esc(perfil.nombre) + '</span>' +
            '<span class="profile-link">Ver perfil <span>&rsaquo;</span></span>' +
            '</div></a>';
    }

    function prepararMenuMovil() {
        var sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        var fondo = document.createElement('div');
        fondo.className = 'sidebar-backdrop';
        document.body.appendChild(fondo);

        var boton = document.createElement('button');
        boton.className = 'menu-toggle';
        boton.setAttribute('aria-label', 'Abrir menú');
        boton.setAttribute('aria-expanded', 'false');
        boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

        var encabezado = document.querySelector('.main-header');
        if (encabezado) encabezado.insertBefore(boton, encabezado.firstChild);
        else document.body.appendChild(boton);

        function alternar(abrir) {
            sidebar.classList.toggle('abierto', abrir);
            fondo.classList.toggle('visible', abrir);
            boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        }

        boton.addEventListener('click', function () {
            alternar(!sidebar.classList.contains('abierto'));
        });
        fondo.addEventListener('click', function () { alternar(false); });
        sidebar.addEventListener('click', function (evento) {
            if (evento.target.closest('a')) alternar(false);
        });
        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') alternar(false);
        });
    }

    /* ---------- Tema claro / oscuro ---------- */

    function aplicarTema() {
        var perfil = global.Store ? global.Store.estado().perfil : {};
        document.documentElement.setAttribute('data-theme', perfil.tema === 'oscuro' ? 'oscuro' : 'claro');
    }

    /* ---------- Animación de cifras ---------- */

    function animarNumero(elemento, hasta, formateador) {
        if (!elemento) return;
        var formato = formateador || fmt;
        var desde = Number(elemento.dataset.valor || 0);
        var destino = Math.round(Number(hasta) || 0);
        elemento.dataset.valor = destino;

        if (desde === destino) { elemento.textContent = formato(destino); return; }

        /* Respetamos la preferencia de menos movimiento */
        if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            elemento.textContent = formato(destino);
            return;
        }

        var duracion = 550;
        var inicio = null;
        function paso(marca) {
            if (inicio === null) inicio = marca;
            var avance = Math.min(1, (marca - inicio) / duracion);
            var suave = 1 - Math.pow(1 - avance, 3);
            elemento.textContent = formato(desde + (destino - desde) * suave);
            if (avance < 1) requestAnimationFrame(paso);
        }
        requestAnimationFrame(paso);
    }

    /* ---------- Estado vacío reutilizable ---------- */

    function estadoVacio(titulo, mensaje, textoBoton, idBoton) {
        return '<div class="estado-vacio">' +
            '<div class="estado-vacio-icono">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/><path d="M12 12v4M10 14h4"/>' +
            '</svg></div>' +
            '<h3>' + esc(titulo) + '</h3>' +
            '<p>' + esc(mensaje) + '</p>' +
            (textoBoton ? '<button class="btn-primary" id="' + esc(idBoton || 'accion-vacio') + '">' + esc(textoBoton) + '</button>' : '') +
            '</div>';
    }

    /* ---------- Arranque común de cada página ---------- */

    /* Ejecuta el arranque de la página una sola vez, aunque el script se cargue
       después de que el documento ya esté listo. */
    function alCargar(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    function iniciar() {
        aplicarTema();
        pintarSidebar();
        prepararMenuMovil();
        prepararCierresGlobales();
        contenedorToasts();

        if (global.Store) {
            global.Store.suscribir(function () {
                aplicarTema();
                actualizarPerfilSidebar();
            });
            if (!global.Store.almacenamientoDisponible) {
                setTimeout(function () {
                    toast('Tu navegador bloquea el almacenamiento local: los cambios no se guardarán.', 'error');
                }, 800);
            }
        }
    }

    /* Actualiza solo el bloque de perfil (evita repintar todo el menú) */
    function actualizarPerfilSidebar() {
        var perfil = global.Store.estado().perfil;
        var nombre = document.querySelector('.sidebar .profile-name');
        if (nombre && nombre.textContent !== perfil.nombre) pintarSidebar();
    }

    /* ---------- API pública ---------- */

    global.Bank = {
        fmt: fmt,
        fmtSigno: fmtSigno,
        fmtCorto: fmtCorto,
        fecha: fecha,
        nombreMes: nombreMes,
        hoyISO: hoyISO,
        esc: esc,
        porcentaje: porcentaje,
        leerMonto: leerMonto,
        escribirMonto: escribirMonto,
        mascaraMonto: mascaraMonto,
        toast: toast,
        abrirModal: abrirModal,
        cerrarModal: cerrarModal,
        confirmar: confirmar,
        iconoSVG: iconoSVG,
        iconoCategoria: iconoCategoria,
        animarNumero: animarNumero,
        estadoVacio: estadoVacio,
        aplicarTema: aplicarTema,
        pintarSidebar: pintarSidebar,
        alCargar: alCargar,
        iniciar: iniciar,
        MESES_CORTOS: MESES_CORTOS,
        MESES_LARGOS: MESES_LARGOS
    };

})(window);
