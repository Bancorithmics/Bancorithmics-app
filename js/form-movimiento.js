/* ============================================================
   Bancorithmics — Formulario de movimientos (compartido)
   ------------------------------------------------------------
   Modal reutilizable para crear o editar un ingreso / egreso.
   Lo usan el panel de inicio y la página de Ingresos y Egresos.

     Bank.formularioMovimiento();                    // nuevo egreso
     Bank.formularioMovimiento({ tipo: 'ingreso' }); // nuevo ingreso
     Bank.formularioMovimiento({ id: 'mov_x' });     // editar
   ============================================================ */
(function (global) {
    'use strict';

    var overlay = null;
    var refs = {};
    var actual = { id: null, tipo: 'egreso' };

    function construir() {
        overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-movimiento';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mov-titulo">' +
            '<div class="modal-header-box">' +
            '<button class="modal-close" data-close-modal aria-label="Cerrar">&times;</button>' +
            '<h2 id="mov-titulo">Nuevo movimiento</h2>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="segmentado" id="mov-tipo">' +
            '<button type="button" data-tipo="ingreso">Ingreso</button>' +
            '<button type="button" data-tipo="egreso">Egreso</button>' +
            '</div>' +

            '<form id="mov-form" novalidate>' +
            '<div class="campo">' +
            '<label for="mov-concepto">Concepto</label>' +
            '<input type="text" class="modal-input" id="mov-concepto" placeholder="Ej: Salario, Supermercado..." maxlength="60" required>' +
            '</div>' +

            '<div class="campo">' +
            '<label for="mov-monto">Monto</label>' +
            '<div class="campo-monto"><span class="simbolo" id="mov-simbolo">$</span>' +
            '<input type="text" class="modal-input" id="mov-monto" placeholder="0" required></div>' +
            '</div>' +

            '<div class="campo-fila">' +
            '<div class="campo">' +
            '<label for="mov-categoria">Categoría</label>' +
            '<select class="modal-input" id="mov-categoria"></select>' +
            '</div>' +
            '<div class="campo">' +
            '<label for="mov-fecha">Fecha</label>' +
            '<input type="date" class="modal-input" id="mov-fecha" required>' +
            '</div>' +
            '</div>' +

            '<div class="campo">' +
            '<label for="mov-cuenta" id="mov-cuenta-label">Pagar desde</label>' +
            '<select class="modal-input" id="mov-cuenta"></select>' +
            '</div>' +

            '<p class="mensaje-error" id="mov-error"></p>' +
            '<button type="submit" class="btn-action" id="mov-guardar">Guardar movimiento</button>' +
            '</form>' +

            '<div class="modal-footer oculto" id="mov-pie">' +
            '<button type="button" class="btn-ghost peligro" id="mov-eliminar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Eliminar movimiento</button>' +
            '</div>' +

            '</div></div>';

        document.body.appendChild(overlay);

        refs = {
            titulo: overlay.querySelector('#mov-titulo'),
            tipo: overlay.querySelector('#mov-tipo'),
            form: overlay.querySelector('#mov-form'),
            concepto: overlay.querySelector('#mov-concepto'),
            monto: overlay.querySelector('#mov-monto'),
            simbolo: overlay.querySelector('#mov-simbolo'),
            categoria: overlay.querySelector('#mov-categoria'),
            fecha: overlay.querySelector('#mov-fecha'),
            cuenta: overlay.querySelector('#mov-cuenta'),
            cuentaLabel: overlay.querySelector('#mov-cuenta-label'),
            error: overlay.querySelector('#mov-error'),
            guardar: overlay.querySelector('#mov-guardar'),
            pie: overlay.querySelector('#mov-pie'),
            eliminar: overlay.querySelector('#mov-eliminar')
        };

        global.Bank.mascaraMonto(refs.monto);

        refs.tipo.addEventListener('click', function (evento) {
            var boton = evento.target.closest('[data-tipo]');
            if (!boton) return;
            marcarTipo(boton.dataset.tipo);
        });

        refs.form.addEventListener('submit', function (evento) {
            evento.preventDefault();
            enviar();
        });

        refs.eliminar.addEventListener('click', function () {
            var idMovimiento = actual.id;
            global.Bank.confirmar({
                titulo: '¿Eliminar este movimiento?',
                mensaje: 'El dinero se devolverá a la cuenta correspondiente. Esta acción no se puede deshacer.',
                textoOk: 'Eliminar',
                peligro: true
            }).then(function (confirmado) {
                if (!confirmado) return;
                try {
                    global.Store.acciones.eliminarMovimiento(idMovimiento);
                    global.Bank.cerrarModal(overlay);
                    global.Bank.toast('Movimiento eliminado.', 'exito');
                } catch (e) {
                    global.Bank.toast(e.message, 'error');
                }
            });
        });
    }

    function marcarTipo(tipo) {
        actual.tipo = tipo === 'ingreso' ? 'ingreso' : 'egreso';

        Array.prototype.forEach.call(refs.tipo.children, function (boton) {
            boton.classList.toggle('activo', boton.dataset.tipo === actual.tipo);
        });

        refs.cuentaLabel.textContent = actual.tipo === 'ingreso' ? 'Depositar en' : 'Pagar desde';
        refs.guardar.classList.toggle('btn-verde', actual.tipo === 'ingreso');

        llenarCategorias();
    }

    function llenarCategorias(seleccionada) {
        var lista = global.Store.CATEGORIAS[actual.tipo];
        refs.categoria.innerHTML = lista.map(function (cat) {
            return '<option value="' + cat.id + '">' + global.Bank.esc(cat.nombre) + '</option>';
        }).join('');
        if (seleccionada) refs.categoria.value = seleccionada;
    }

    function llenarCuentas(seleccionada) {
        var cuentas = global.Store.sel.cuentas();
        refs.cuenta.innerHTML = cuentas.map(function (cuenta) {
            return '<option value="' + cuenta.id + '">' + global.Bank.esc(cuenta.nombre) +
                ' — ' + global.Bank.fmt(cuenta.saldo) + '</option>';
        }).join('');
        if (seleccionada) refs.cuenta.value = seleccionada;
    }

    function mostrarError(mensaje) {
        refs.error.textContent = mensaje || '';
    }

    function enviar() {
        mostrarError('');

        var datos = {
            tipo: actual.tipo,
            concepto: refs.concepto.value,
            monto: global.Bank.leerMonto(refs.monto),
            categoria: refs.categoria.value,
            fecha: refs.fecha.value,
            cuenta: refs.cuenta.value
        };

        if (!datos.concepto.trim()) {
            mostrarError('Escribe un concepto para identificar el movimiento.');
            refs.concepto.focus();
            return;
        }
        if (!datos.monto) {
            mostrarError('Ingresa un monto mayor a cero.');
            refs.monto.focus();
            return;
        }

        try {
            if (actual.id) {
                global.Store.acciones.editarMovimiento(actual.id, datos);
                global.Bank.toast('Movimiento actualizado.', 'exito');
            } else {
                global.Store.acciones.agregarMovimiento(datos);
                global.Bank.toast(
                    (datos.tipo === 'ingreso' ? 'Ingreso' : 'Egreso') + ' de ' +
                    global.Bank.fmt(datos.monto) + ' registrado.', 'exito');
            }
            global.Bank.cerrarModal(overlay);
        } catch (e) {
            mostrarError(e.message);
        }
    }

    function abrir(opciones) {
        var opts = opciones || {};
        if (!overlay) construir();

        mostrarError('');
        refs.form.reset();
        actual.id = opts.id || null;

        if (actual.id) {
            var movimiento = null;
            var lista = global.Store.estado().movimientos;
            for (var i = 0; i < lista.length; i++) {
                if (lista[i].id === actual.id) { movimiento = lista[i]; break; }
            }
            if (!movimiento) {
                global.Bank.toast('El movimiento ya no existe.', 'error');
                return;
            }
            refs.titulo.textContent = 'Editar movimiento';
            refs.guardar.textContent = 'Guardar cambios';
            refs.pie.classList.remove('oculto');

            marcarTipo(movimiento.tipo);
            refs.concepto.value = movimiento.concepto;
            global.Bank.escribirMonto(refs.monto, movimiento.monto);
            llenarCategorias(movimiento.categoria);
            refs.fecha.value = movimiento.fecha;
            llenarCuentas(movimiento.cuenta);
        } else {
            refs.titulo.textContent = 'Nuevo movimiento';
            refs.guardar.textContent = 'Guardar movimiento';
            refs.pie.classList.add('oculto');

            marcarTipo(opts.tipo || 'egreso');
            refs.fecha.value = global.Bank.hoyISO();
            llenarCuentas(opts.cuenta || 'disponible');
        }

        global.Bank.abrirModal(overlay);
    }

    global.Bank.formularioMovimiento = abrir;

})(window);
