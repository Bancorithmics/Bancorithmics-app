/* ============================================================
   Bancorithmics — Metas de ahorro
   Reúne el colchón y los bolsillos que tienen una meta definida
   y estima cuánto falta para completarlas.
   ============================================================ */
(function () {
    'use strict';

    var $ = function (id) { return document.getElementById(id); };

    /* Todas las metas activas, ordenadas por avance */
    function recopilarMetas() {
        var estado = Store.estado();
        var metas = [];

        if (estado.colchon.meta > 0) {
            metas.push({
                id: 'colchon',
                nombre: 'Colchón de emergencia',
                saldo: estado.colchon.saldo,
                meta: estado.colchon.meta,
                color: 'blue',
                icono: 'ahorro',
                enlace: 'colchon.html'
            });
        }

        estado.bolsillos.forEach(function (bolsillo) {
            if (bolsillo.meta > 0) {
                metas.push({
                    id: bolsillo.id,
                    nombre: bolsillo.nombre,
                    saldo: bolsillo.saldo,
                    meta: bolsillo.meta,
                    color: bolsillo.color,
                    icono: bolsillo.icono,
                    enlace: 'bolsillos.html#' + bolsillo.id
                });
            }
        });

        return metas.sort(function (a, b) {
            return (b.saldo / b.meta) - (a.saldo / a.meta);
        });
    }

    /* ---------- Resumen global ---------- */

    function pintarResumen(metas) {
        var objetivo = metas.reduce(function (suma, meta) { return suma + meta.meta; }, 0);
        var ahorrado = metas.reduce(function (suma, meta) { return suma + Math.min(meta.saldo, meta.meta); }, 0);
        var avance = Bank.porcentaje(ahorrado, objetivo);
        var ritmo = Store.sel.ahorroPromedioMensual(6);

        Bank.animarNumero($('total-ahorrado'), ahorrado);
        $('objetivo-total').textContent = Bank.fmt(objetivo);
        $('avance-global').textContent = objetivo > 0 ? avance + '%' : '—';
        $('barra-global').style.width = avance + '%';

        $('ritmo-ahorro').textContent = Bank.fmt(ritmo);
        $('ritmo-ahorro').className = 'mini-stat-valor ' + (ritmo >= 0 ? 'amount-positive' : 'amount-negative');

        $('subtitulo').textContent = metas.length
            ? metas.length + (metas.length === 1 ? ' meta activa' : ' metas activas')
            : 'Aún no has definido ninguna meta';

        pintarConsejo(metas, objetivo - ahorrado, ritmo);
    }

    function pintarConsejo(metas, faltante, ritmo) {
        if (!metas.length) {
            $('consejo-metas').innerHTML = '<b>¿Cómo funcionan las metas?</b> Cada bolsillo puede tener una meta ' +
                'de ahorro, y el colchón también. Cuando la defines, aquí puedes seguir tu avance y saber ' +
                'cuánto te falta para lograrla.';
            return;
        }

        if (faltante <= 0) {
            $('consejo-metas').innerHTML = '<b>¡Felicitaciones!</b> Completaste todas tus metas. ' +
                'Es un buen momento para plantear objetivos nuevos o subir los actuales.';
            return;
        }

        if (ritmo <= 0) {
            $('consejo-metas').innerHTML = '<b>Te faltan ' + Bank.fmt(faltante) + '</b> para completar todas ' +
                'tus metas. En los últimos meses gastaste más de lo que ingresaste, así que primero conviene ' +
                'equilibrar el balance mensual.';
            return;
        }

        var meses = Math.ceil(faltante / ritmo);
        $('consejo-metas').innerHTML = '<b>Te faltan ' + Bank.fmt(faltante) + '</b> para completar todas tus metas. ' +
            'Ahorrando ' + Bank.fmt(ritmo) + ' al mes (tu promedio actual) lo lograrías en aproximadamente ' +
            meses + (meses === 1 ? ' mes' : ' meses') + '.';
    }

    /* ---------- Tarjetas ---------- */

    function anillo(porcentaje, color) {
        var radio = 30;
        var circunferencia = 2 * Math.PI * radio;
        var avance = circunferencia * (porcentaje / 100);

        return '<div class="anillo">' +
            '<svg viewBox="0 0 76 76" aria-hidden="true">' +
            '<circle class="anillo-fondo" cx="38" cy="38" r="' + radio + '"/>' +
            '<circle class="anillo-valor" cx="38" cy="38" r="' + radio + '" stroke="var(--c-' + color + ')" ' +
            'stroke-dasharray="' + circunferencia + '" stroke-dashoffset="' + (circunferencia - avance) + '"/>' +
            '</svg>' +
            '<span class="anillo-texto">' + porcentaje + '%</span></div>';
    }

    function pintarLista(metas) {
        var contenedor = $('metas-lista');

        if (!metas.length) {
            contenedor.innerHTML = '<div class="panel" style="grid-column:1/-1">' +
                Bank.estadoVacio('Todavía no tienes metas',
                    'Define una meta en cualquiera de tus bolsillos o en el colchón y aparecerá aquí ' +
                    'con su avance y una estimación de cuánto te falta.',
                    'Ir a bolsillos', 'btn-ir-bolsillos') + '</div>';
            var boton = $('btn-ir-bolsillos');
            if (boton) boton.addEventListener('click', function () { window.location.href = 'bolsillos.html'; });
            return;
        }

        var ritmo = Store.sel.ahorroPromedioMensual(6);

        contenedor.innerHTML = metas.map(function (meta) {
            var avance = Bank.porcentaje(meta.saldo, meta.meta);
            var falta = Math.max(0, meta.meta - meta.saldo);
            var completa = falta === 0;

            var proyeccion;
            if (completa) {
                proyeccion = '<span class="meta-completa">✓ Meta completada</span>';
            } else if (ritmo > 0) {
                var meses = Math.ceil(falta / ritmo);
                proyeccion = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
                    '≈ ' + meses + (meses === 1 ? ' mes' : ' meses') + ' a tu ritmo de ahorro';
            } else {
                proyeccion = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                    '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>' +
                    'Sin ahorro mensual para estimar';
            }

            return '<a class="meta-card" href="' + meta.enlace + '">' +
                anillo(avance, meta.color) +
                '<div class="meta-detalle">' +
                '<div class="meta-nombre">' + Bank.esc(meta.nombre) + '</div>' +
                '<div class="meta-cifras"><b>' + Bank.fmt(meta.saldo) + '</b> de ' + Bank.fmt(meta.meta) +
                (completa ? '' : ' · faltan ' + Bank.fmt(falta)) + '</div>' +
                '<div class="meta-proyeccion">' + proyeccion + '</div>' +
                '</div></a>';
        }).join('');
    }

    /* ---------- Arranque ---------- */

    function render() {
        var metas = recopilarMetas();
        pintarResumen(metas);
        pintarLista(metas);
    }

    Bank.alCargar(function () {
        Bank.iniciar();
        render();
        Store.suscribir(render);
    });

})();
