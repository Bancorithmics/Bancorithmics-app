/* ============================================================
   Bancorithmics — Capa de datos (Store)
   ------------------------------------------------------------
   Fuente única de verdad de la aplicación. Guarda el estado en
   localStorage, valida todas las operaciones de dinero y avisa a
   las vistas cuando algo cambia.

   Uso:
     Store.estado()                      -> lee el estado (no mutar)
     Store.suscribir(fn)                 -> escucha cambios
     Store.acciones.agregarMovimiento()  -> modifica el estado

   Todas las acciones lanzan un Error con mensaje en español
   cuando la operación no es válida (saldo insuficiente, montos
   negativos, etc.). Las vistas lo capturan y muestran un toast.
   ============================================================ */
(function (global) {
    'use strict';

    var CLAVE = 'bancorithmics:datos';
    var VERSION = 1;

    /* ---------- Catálogos ---------- */

    var CATEGORIAS = {
        ingreso: [
            { id: 'trabajo', nombre: 'Trabajo', color: 'blue' },
            { id: 'freelance', nombre: 'Freelance', color: 'teal' },
            { id: 'ventas', nombre: 'Ventas', color: 'green' },
            { id: 'inversiones', nombre: 'Inversiones', color: 'purple' },
            { id: 'regalo', nombre: 'Regalo', color: 'pink' },
            { id: 'otros-ingreso', nombre: 'Otros', color: 'gray' }
        ],
        egreso: [
            { id: 'alimentacion', nombre: 'Alimentación', color: 'green' },
            { id: 'transporte', nombre: 'Transporte', color: 'blue' },
            { id: 'servicios', nombre: 'Servicios', color: 'amber' },
            { id: 'entretenimiento', nombre: 'Entretenimiento', color: 'purple' },
            { id: 'salud', nombre: 'Salud', color: 'red' },
            { id: 'educacion', nombre: 'Educación', color: 'indigo' },
            { id: 'hogar', nombre: 'Hogar', color: 'teal' },
            { id: 'compras', nombre: 'Compras', color: 'pink' },
            { id: 'otros-egreso', nombre: 'Otros', color: 'gray' }
        ]
    };

    /* Paleta disponible para los bolsillos */
    var COLORES = ['blue', 'green', 'purple', 'red', 'teal', 'amber', 'pink', 'indigo'];

    /* Iconos disponibles (se dibujan en ui.js) */
    var ICONOS = ['bus', 'comida', 'juego', 'rayo', 'ahorro', 'casa', 'salud', 'estudio', 'regalo', 'avion'];

    /* ---------- Utilidades internas ---------- */

    function id(prefijo) {
        return prefijo + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function dosDigitos(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function aISO(fecha) {
        return fecha.getFullYear() + '-' + dosDigitos(fecha.getMonth() + 1) + '-' + dosDigitos(fecha.getDate());
    }

    /* Normaliza un monto: entero positivo en pesos */
    function normalizarMonto(valor, etiqueta) {
        var n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d.-]/g, ''));
        if (!isFinite(n) || isNaN(n)) throw new Error('El ' + (etiqueta || 'monto') + ' no es un número válido.');
        n = Math.round(n);
        if (n <= 0) throw new Error('El ' + (etiqueta || 'monto') + ' debe ser mayor a cero.');
        if (n > 999999999999) throw new Error('El ' + (etiqueta || 'monto') + ' es demasiado grande.');
        return n;
    }

    function textoLimpio(valor, etiqueta, maximo) {
        var t = String(valor == null ? '' : valor).trim();
        if (!t) throw new Error('El campo "' + etiqueta + '" es obligatorio.');
        if (t.length > (maximo || 60)) t = t.slice(0, maximo || 60);
        return t;
    }

    function clonar(objeto) {
        return JSON.parse(JSON.stringify(objeto));
    }

    /* ---------- Datos de ejemplo (primera vez que se abre la app) ---------- */

    function diaDeEsteMes(dia) {
        var hoy = new Date();
        /* Nunca generamos movimientos en el futuro */
        var maximo = hoy.getDate();
        return aISO(new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, maximo)));
    }

    function diaDelMesPasado(dia) {
        var hoy = new Date();
        var mesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        var ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
        return aISO(new Date(mesPasado.getFullYear(), mesPasado.getMonth(), Math.min(dia, ultimoDia)));
    }

    function estadoDemo() {
        var bolsillos = [
            { id: 'b_transporte', nombre: 'Transporte', saldo: 350000, meta: 1000000, color: 'blue', icono: 'bus' },
            { id: 'b_alimentos', nombre: 'Alimentos', saldo: 900000, meta: 1500000, color: 'green', icono: 'comida' },
            { id: 'b_entretenimiento', nombre: 'Entretenimiento', saldo: 1403000, meta: 2000000, color: 'purple', icono: 'juego' },
            { id: 'b_emergencias', nombre: 'Emergencias', saldo: 900000, meta: 1800000, color: 'red', icono: 'rayo' },
            { id: 'b_ahorros', nombre: 'Ahorros', saldo: 700000, meta: 2500000, color: 'teal', icono: 'ahorro' }
        ];

        var movimientos = [
            m('ingreso', 'Salario', 'trabajo', 2000000, diaDeEsteMes(2)),
            m('egreso', 'Arriendo', 'hogar', 900000, diaDeEsteMes(3)),
            m('egreso', 'Supermercado', 'alimentacion', 150000, diaDeEsteMes(4)),
            m('egreso', 'Transporte público', 'transporte', 80000, diaDeEsteMes(5)),
            m('egreso', 'Luz y agua', 'servicios', 120000, diaDeEsteMes(8)),
            m('egreso', 'Cine', 'entretenimiento', 45000, diaDeEsteMes(9)),
            m('ingreso', 'Freelance', 'freelance', 1200000, diaDeEsteMes(12)),
            m('egreso', 'Internet', 'servicios', 95000, diaDeEsteMes(15)),
            m('egreso', 'Gimnasio', 'salud', 90000, diaDeEsteMes(18)),
            m('ingreso', 'Venta de objeto', 'ventas', 60000, diaDeEsteMes(20)),
            m('egreso', 'Farmacia', 'salud', 60000, diaDeEsteMes(21)),
            m('ingreso', 'Salario', 'trabajo', 2000000, diaDelMesPasado(2)),
            m('egreso', 'Arriendo', 'hogar', 900000, diaDelMesPasado(3)),
            m('egreso', 'Mercado del mes', 'alimentacion', 320000, diaDelMesPasado(6)),
            m('egreso', 'Servicios', 'servicios', 210000, diaDelMesPasado(10)),
            m('egreso', 'Gasolina', 'transporte', 180000, diaDelMesPasado(14)),
            m('egreso', 'Cumpleaños', 'entretenimiento', 130000, diaDelMesPasado(22))
        ];

        function m(tipo, concepto, categoria, monto, fecha) {
            return {
                id: id('mov'),
                tipo: tipo,
                concepto: concepto,
                categoria: categoria,
                monto: monto,
                fecha: fecha,
                cuenta: 'disponible',
                nota: ''
            };
        }

        return {
            version: VERSION,
            perfil: {
                nombre: 'Andres Felipe',
                avatar: 'https://i.pravatar.cc/80?img=12',
                moneda: 'COP',
                tema: 'claro'
            },
            saldo: 2450000,
            colchon: { saldo: 850000, meta: 5000000 },
            bolsillos: bolsillos,
            movimientos: movimientos,
            transferencias: []
        };
    }

    function estadoVacio() {
        return {
            version: VERSION,
            perfil: { nombre: 'Mi cuenta', avatar: '', moneda: 'COP', tema: 'claro' },
            saldo: 0,
            colchon: { saldo: 0, meta: 0 },
            bolsillos: [],
            movimientos: [],
            transferencias: []
        };
    }

    /* ---------- Persistencia ---------- */

    var almacenamientoDisponible = (function () {
        try {
            var prueba = '__bancorithmics__';
            global.localStorage.setItem(prueba, '1');
            global.localStorage.removeItem(prueba);
            return true;
        } catch (e) {
            return false;
        }
    })();

    function cargar() {
        if (!almacenamientoDisponible) return estadoDemo();
        try {
            var crudo = global.localStorage.getItem(CLAVE);
            if (!crudo) return estadoDemo();
            var datos = JSON.parse(crudo);
            if (!datos || datos.version !== VERSION) return estadoDemo();
            /* Rellenamos campos que puedan faltar por versiones anteriores */
            datos.perfil = datos.perfil || estadoVacio().perfil;
            datos.colchon = datos.colchon || { saldo: 0, meta: 0 };
            datos.bolsillos = datos.bolsillos || [];
            datos.movimientos = datos.movimientos || [];
            datos.transferencias = datos.transferencias || [];
            datos.saldo = Number(datos.saldo) || 0;
            return datos;
        } catch (e) {
            console.warn('Bancorithmics: no se pudieron leer los datos guardados.', e);
            return estadoDemo();
        }
    }

    var estado = cargar();
    var oyentes = [];

    function guardar() {
        if (!almacenamientoDisponible) return;
        try {
            global.localStorage.setItem(CLAVE, JSON.stringify(estado));
        } catch (e) {
            console.warn('Bancorithmics: no se pudo guardar. ¿Almacenamiento lleno?', e);
        }
    }

    function emitir() {
        guardar();
        for (var i = 0; i < oyentes.length; i++) {
            try {
                oyentes[i](estado);
            } catch (e) {
                console.error('Bancorithmics: error en un suscriptor.', e);
            }
        }
    }

    function suscribir(fn) {
        oyentes.push(fn);
        return function desuscribir() {
            var i = oyentes.indexOf(fn);
            if (i > -1) oyentes.splice(i, 1);
        };
    }

    /* ---------- Acceso a "cuentas" (disponible / colchón / bolsillos) ---------- */

    function buscarBolsillo(idBolsillo) {
        for (var i = 0; i < estado.bolsillos.length; i++) {
            if (estado.bolsillos[i].id === idBolsillo) return estado.bolsillos[i];
        }
        return null;
    }

    function nombreCuenta(cuenta) {
        if (cuenta === 'disponible') return 'Saldo disponible';
        if (cuenta === 'colchon') return 'Colchón';
        var b = buscarBolsillo(cuenta);
        return b ? 'Bolsillo ' + b.nombre : 'Cuenta desconocida';
    }

    function saldoDeCuenta(cuenta) {
        if (cuenta === 'disponible') return estado.saldo;
        if (cuenta === 'colchon') return estado.colchon.saldo;
        var b = buscarBolsillo(cuenta);
        if (!b) throw new Error('El bolsillo indicado ya no existe.');
        return b.saldo;
    }

    function ajustarCuenta(cuenta, delta) {
        if (cuenta === 'disponible') {
            estado.saldo += delta;
            return;
        }
        if (cuenta === 'colchon') {
            estado.colchon.saldo += delta;
            return;
        }
        var b = buscarBolsillo(cuenta);
        if (!b) throw new Error('El bolsillo indicado ya no existe.');
        b.saldo += delta;
    }

    /* Verifica que una cuenta tenga fondos antes de descontar */
    function exigirFondos(cuenta, monto) {
        var disponible = saldoDeCuenta(cuenta);
        if (disponible < monto) {
            throw new Error('Fondos insuficientes en "' + nombreCuenta(cuenta) + '". Disponible: ' + formatoSimple(disponible) + '.');
        }
    }

    function formatoSimple(n) {
        return '$' + Math.round(n).toLocaleString('es-CO');
    }

    /* Efecto de un movimiento sobre los saldos: +monto si es ingreso, -monto si es egreso */
    function signo(tipo) {
        return tipo === 'ingreso' ? 1 : -1;
    }

    function aplicarMovimiento(mov) {
        ajustarCuenta(mov.cuenta, signo(mov.tipo) * mov.monto);
    }

    function revertirMovimiento(mov) {
        ajustarCuenta(mov.cuenta, -signo(mov.tipo) * mov.monto);
    }

    function validarCuenta(cuenta) {
        if (cuenta === 'disponible' || cuenta === 'colchon') return cuenta;
        if (buscarBolsillo(cuenta)) return cuenta;
        throw new Error('La cuenta seleccionada no existe.');
    }

    function validarCategoria(tipo, categoria) {
        var lista = CATEGORIAS[tipo];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].id === categoria) return categoria;
        }
        return lista[lista.length - 1].id; /* "Otros" como respaldo */
    }

    function validarFecha(fecha) {
        var texto = String(fecha || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return aISO(new Date());
        return texto;
    }

    /* ============================================================
       ACCIONES
       ============================================================ */

    var acciones = {

        /* ---- CRUD de movimientos (ingresos y egresos) ---- */

        agregarMovimiento: function (datos) {
            var tipo = datos.tipo === 'ingreso' ? 'ingreso' : 'egreso';
            var mov = {
                id: id('mov'),
                tipo: tipo,
                concepto: textoLimpio(datos.concepto, 'Concepto'),
                categoria: validarCategoria(tipo, datos.categoria),
                monto: normalizarMonto(datos.monto),
                fecha: validarFecha(datos.fecha),
                cuenta: validarCuenta(datos.cuenta || 'disponible'),
                nota: String(datos.nota || '').trim().slice(0, 200)
            };

            if (tipo === 'egreso') exigirFondos(mov.cuenta, mov.monto);

            estado.movimientos.push(mov);
            aplicarMovimiento(mov);
            emitir();
            return mov;
        },

        editarMovimiento: function (idMovimiento, cambios) {
            var indice = -1;
            for (var i = 0; i < estado.movimientos.length; i++) {
                if (estado.movimientos[i].id === idMovimiento) { indice = i; break; }
            }
            if (indice === -1) throw new Error('El movimiento no existe.');

            var original = estado.movimientos[indice];
            var tipo = cambios.tipo === 'ingreso' || cambios.tipo === 'egreso' ? cambios.tipo : original.tipo;

            var actualizado = {
                id: original.id,
                tipo: tipo,
                concepto: textoLimpio(cambios.concepto != null ? cambios.concepto : original.concepto, 'Concepto'),
                categoria: validarCategoria(tipo, cambios.categoria != null ? cambios.categoria : original.categoria),
                monto: normalizarMonto(cambios.monto != null ? cambios.monto : original.monto),
                fecha: validarFecha(cambios.fecha != null ? cambios.fecha : original.fecha),
                cuenta: validarCuenta(cambios.cuenta != null ? cambios.cuenta : original.cuenta),
                nota: String(cambios.nota != null ? cambios.nota : original.nota || '').trim().slice(0, 200)
            };

            /* Probamos el cambio sobre una copia de los saldos para no dejar
               el estado a medias si algo falla. */
            var respaldo = respaldarSaldos();
            try {
                revertirMovimiento(original);
                aplicarMovimiento(actualizado);
                verificarSaldosNoNegativos();
            } catch (e) {
                restaurarSaldos(respaldo);
                throw e;
            }

            estado.movimientos[indice] = actualizado;
            emitir();
            return actualizado;
        },

        eliminarMovimiento: function (idMovimiento) {
            var indice = -1;
            for (var i = 0; i < estado.movimientos.length; i++) {
                if (estado.movimientos[i].id === idMovimiento) { indice = i; break; }
            }
            if (indice === -1) throw new Error('El movimiento no existe.');

            var mov = estado.movimientos[indice];
            var respaldo = respaldarSaldos();
            try {
                revertirMovimiento(mov);
                verificarSaldosNoNegativos();
            } catch (e) {
                restaurarSaldos(respaldo);
                throw new Error('No se puede eliminar: el saldo de "' + nombreCuenta(mov.cuenta) + '" quedaría en negativo.');
            }

            estado.movimientos.splice(indice, 1);
            emitir();
        },

        /* ---- Transferencias internas (colchón y bolsillos) ---- */

        transferir: function (origen, destino, monto) {
            var desde = validarCuenta(origen);
            var hacia = validarCuenta(destino);
            if (desde === hacia) throw new Error('El origen y el destino deben ser diferentes.');

            var valor = normalizarMonto(monto);
            exigirFondos(desde, valor);

            ajustarCuenta(desde, -valor);
            ajustarCuenta(hacia, valor);

            estado.transferencias.unshift({
                id: id('tra'),
                fecha: new Date().toISOString(),
                origen: desde,
                destino: hacia,
                monto: valor
            });
            /* Conservamos un historial acotado */
            if (estado.transferencias.length > 200) estado.transferencias.length = 200;

            emitir();
        },

        /* ---- Colchón ---- */

        actualizarMetaColchon: function (meta) {
            var valor = Math.max(0, Math.round(Number(meta) || 0));
            estado.colchon.meta = valor;
            emitir();
        },

        /* ---- Bolsillos ---- */

        crearBolsillo: function (datos) {
            var nombre = textoLimpio(datos.nombre, 'Nombre del bolsillo', 28);

            var repetido = estado.bolsillos.some(function (b) {
                return b.nombre.toLowerCase() === nombre.toLowerCase();
            });
            if (repetido) throw new Error('Ya tienes un bolsillo llamado "' + nombre + '".');
            if (estado.bolsillos.length >= 24) throw new Error('Has alcanzado el máximo de 24 bolsillos.');

            var bolsillo = {
                id: id('bol'),
                nombre: nombre,
                saldo: 0,
                meta: Math.max(0, Math.round(Number(datos.meta) || 0)),
                color: COLORES.indexOf(datos.color) > -1 ? datos.color : COLORES[estado.bolsillos.length % COLORES.length],
                icono: ICONOS.indexOf(datos.icono) > -1 ? datos.icono : 'ahorro'
            };

            estado.bolsillos.push(bolsillo);

            /* Depósito inicial opcional */
            var inicial = Math.round(Number(datos.montoInicial) || 0);
            if (inicial > 0) {
                if (estado.saldo < inicial) {
                    estado.bolsillos.pop();
                    throw new Error('No tienes saldo disponible suficiente para el depósito inicial.');
                }
                estado.saldo -= inicial;
                bolsillo.saldo = inicial;
                estado.transferencias.unshift({
                    id: id('tra'),
                    fecha: new Date().toISOString(),
                    origen: 'disponible',
                    destino: bolsillo.id,
                    monto: inicial
                });
            }

            emitir();
            return bolsillo;
        },

        editarBolsillo: function (idBolsillo, cambios) {
            var bolsillo = buscarBolsillo(idBolsillo);
            if (!bolsillo) throw new Error('El bolsillo no existe.');

            if (cambios.nombre != null) {
                var nombre = textoLimpio(cambios.nombre, 'Nombre del bolsillo', 28);
                var repetido = estado.bolsillos.some(function (b) {
                    return b.id !== idBolsillo && b.nombre.toLowerCase() === nombre.toLowerCase();
                });
                if (repetido) throw new Error('Ya tienes un bolsillo llamado "' + nombre + '".');
                bolsillo.nombre = nombre;
            }
            if (cambios.meta != null) bolsillo.meta = Math.max(0, Math.round(Number(cambios.meta) || 0));
            if (cambios.color != null && COLORES.indexOf(cambios.color) > -1) bolsillo.color = cambios.color;
            if (cambios.icono != null && ICONOS.indexOf(cambios.icono) > -1) bolsillo.icono = cambios.icono;

            emitir();
            return bolsillo;
        },

        eliminarBolsillo: function (idBolsillo) {
            var bolsillo = buscarBolsillo(idBolsillo);
            if (!bolsillo) throw new Error('El bolsillo no existe.');

            var enUso = estado.movimientos.some(function (mov) { return mov.cuenta === idBolsillo; });
            if (enUso) {
                throw new Error('Este bolsillo tiene movimientos registrados. Reasigna o elimina esos movimientos primero.');
            }

            /* El dinero del bolsillo regresa al saldo disponible */
            var devuelto = bolsillo.saldo;
            if (devuelto > 0) {
                estado.saldo += devuelto;
                estado.transferencias.unshift({
                    id: id('tra'),
                    fecha: new Date().toISOString(),
                    origen: idBolsillo,
                    destino: 'disponible',
                    monto: devuelto,
                    nombreOrigen: bolsillo.nombre
                });
            }

            estado.bolsillos = estado.bolsillos.filter(function (b) { return b.id !== idBolsillo; });
            emitir();
            return devuelto;
        },

        /* ---- Perfil y datos ---- */

        actualizarPerfil: function (cambios) {
            if (cambios.nombre != null) estado.perfil.nombre = String(cambios.nombre).trim().slice(0, 40) || 'Mi cuenta';
            if (cambios.avatar != null) estado.perfil.avatar = String(cambios.avatar).trim().slice(0, 300);
            if (cambios.moneda != null) estado.perfil.moneda = String(cambios.moneda).trim().slice(0, 6).toUpperCase();
            if (cambios.tema != null) estado.perfil.tema = cambios.tema === 'oscuro' ? 'oscuro' : 'claro';
            emitir();
        },

        restablecerDemo: function () {
            estado = estadoDemo();
            emitir();
        },

        borrarTodo: function () {
            var perfil = clonar(estado.perfil);
            estado = estadoVacio();
            estado.perfil = perfil;
            emitir();
        },

        exportar: function () {
            return JSON.stringify(estado, null, 2);
        },

        importar: function (textoJSON) {
            var datos;
            try {
                datos = JSON.parse(textoJSON);
            } catch (e) {
                throw new Error('El archivo no es un JSON válido.');
            }
            if (!datos || typeof datos !== 'object' || !Array.isArray(datos.movimientos) || !Array.isArray(datos.bolsillos)) {
                throw new Error('El archivo no tiene el formato de Bancorithmics.');
            }
            var base = estadoVacio();
            estado = {
                version: VERSION,
                perfil: Object.assign(base.perfil, datos.perfil || {}),
                saldo: Math.round(Number(datos.saldo) || 0),
                colchon: {
                    saldo: Math.round(Number(datos.colchon && datos.colchon.saldo) || 0),
                    meta: Math.round(Number(datos.colchon && datos.colchon.meta) || 0)
                },
                bolsillos: datos.bolsillos,
                movimientos: datos.movimientos,
                transferencias: Array.isArray(datos.transferencias) ? datos.transferencias : []
            };
            emitir();
        }
    };

    /* Copias de seguridad de saldos para operaciones que pueden fallar a mitad */
    function respaldarSaldos() {
        return {
            saldo: estado.saldo,
            colchon: estado.colchon.saldo,
            bolsillos: estado.bolsillos.map(function (b) { return { id: b.id, saldo: b.saldo }; })
        };
    }

    function restaurarSaldos(respaldo) {
        estado.saldo = respaldo.saldo;
        estado.colchon.saldo = respaldo.colchon;
        respaldo.bolsillos.forEach(function (item) {
            var b = buscarBolsillo(item.id);
            if (b) b.saldo = item.saldo;
        });
    }

    function verificarSaldosNoNegativos() {
        if (estado.saldo < 0) throw new Error('La operación dejaría el saldo disponible en negativo.');
        if (estado.colchon.saldo < 0) throw new Error('La operación dejaría el colchón en negativo.');
        for (var i = 0; i < estado.bolsillos.length; i++) {
            if (estado.bolsillos[i].saldo < 0) {
                throw new Error('La operación dejaría el bolsillo "' + estado.bolsillos[i].nombre + '" en negativo.');
            }
        }
    }

    /* ============================================================
       SELECTORES (lecturas derivadas del estado)
       ============================================================ */

    var selectores = {

        totales: function () {
            var enBolsillos = estado.bolsillos.reduce(function (suma, b) { return suma + b.saldo; }, 0);
            return {
                disponible: estado.saldo,
                colchon: estado.colchon.saldo,
                bolsillos: enBolsillos,
                patrimonio: estado.saldo + estado.colchon.saldo + enBolsillos
            };
        },

        /* Movimientos ordenados del más reciente al más antiguo */
        movimientosOrdenados: function () {
            return estado.movimientos.slice().sort(function (a, b) {
                if (a.fecha === b.fecha) return a.id < b.id ? 1 : -1;
                return a.fecha < b.fecha ? 1 : -1;
            });
        },

        /* Clave 'YYYY-MM' de un mes desplazado respecto al actual */
        claveMes: function (desplazamiento) {
            var hoy = new Date();
            var d = new Date(hoy.getFullYear(), hoy.getMonth() + (desplazamiento || 0), 1);
            return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1);
        },

        resumenMes: function (clave) {
            var mes = clave || selectores.claveMes(0);
            var ingresos = 0, egresos = 0, cantidad = 0;
            estado.movimientos.forEach(function (mov) {
                if (mov.fecha.slice(0, 7) !== mes) return;
                cantidad++;
                if (mov.tipo === 'ingreso') ingresos += mov.monto;
                else egresos += mov.monto;
            });
            return { mes: mes, ingresos: ingresos, egresos: egresos, balance: ingresos - egresos, cantidad: cantidad };
        },

        /* Totales por categoría para un tipo y un mes ('todos' para el histórico) */
        porCategoria: function (tipo, clave) {
            var acumulado = {};
            estado.movimientos.forEach(function (mov) {
                if (mov.tipo !== tipo) return;
                if (clave && clave !== 'todos' && mov.fecha.slice(0, 7) !== clave) return;
                acumulado[mov.categoria] = (acumulado[mov.categoria] || 0) + mov.monto;
            });
            return Object.keys(acumulado).map(function (idCategoria) {
                var cat = selectores.categoria(tipo, idCategoria);
                return { id: idCategoria, nombre: cat.nombre, color: cat.color, total: acumulado[idCategoria] };
            }).sort(function (a, b) { return b.total - a.total; });
        },

        /* Serie de los últimos N meses: [{clave, etiqueta, ingresos, egresos}] */
        serieMensual: function (meses) {
            var total = meses || 6;
            var serie = [];
            for (var i = total - 1; i >= 0; i--) {
                var clave = selectores.claveMes(-i);
                var resumen = selectores.resumenMes(clave);
                serie.push({
                    clave: clave,
                    ingresos: resumen.ingresos,
                    egresos: resumen.egresos,
                    balance: resumen.balance
                });
            }
            return serie;
        },

        /* Ahorro promedio mensual de los últimos meses con actividad */
        ahorroPromedioMensual: function (meses) {
            var serie = selectores.serieMensual(meses || 6).filter(function (m) {
                return m.ingresos > 0 || m.egresos > 0;
            });
            if (!serie.length) return 0;
            var suma = serie.reduce(function (acumulado, m) { return acumulado + m.balance; }, 0);
            return Math.round(suma / serie.length);
        },

        categoria: function (tipo, idCategoria) {
            var lista = CATEGORIAS[tipo] || [];
            for (var i = 0; i < lista.length; i++) {
                if (lista[i].id === idCategoria) return lista[i];
            }
            return { id: idCategoria, nombre: 'Otros', color: 'gray' };
        },

        bolsillo: function (idBolsillo) {
            return buscarBolsillo(idBolsillo);
        },

        nombreCuenta: nombreCuenta,

        /* Lista de cuentas para los selectores de los formularios */
        cuentas: function () {
            var lista = [{ id: 'disponible', nombre: 'Saldo disponible', saldo: estado.saldo }];
            lista.push({ id: 'colchon', nombre: 'Colchón', saldo: estado.colchon.saldo });
            estado.bolsillos.forEach(function (b) {
                lista.push({ id: b.id, nombre: 'Bolsillo: ' + b.nombre, saldo: b.saldo });
            });
            return lista;
        },

        /* Movimientos y transferencias de una cuenta, unificados y ordenados */
        historialCuenta: function (cuenta, limite) {
            var items = [];

            estado.movimientos.forEach(function (mov) {
                if (mov.cuenta !== cuenta) return;
                items.push({
                    tipo: mov.tipo,
                    concepto: mov.concepto,
                    monto: mov.monto,
                    fecha: mov.fecha,
                    entra: mov.tipo === 'ingreso'
                });
            });

            estado.transferencias.forEach(function (tra) {
                if (tra.origen !== cuenta && tra.destino !== cuenta) return;
                var entra = tra.destino === cuenta;
                var otra = entra ? tra.origen : tra.destino;
                items.push({
                    tipo: 'transferencia',
                    concepto: (entra ? 'Desde ' : 'Hacia ') + (tra.nombreOrigen || nombreCuenta(otra)),
                    monto: tra.monto,
                    fecha: tra.fecha.slice(0, 10),
                    entra: entra
                });
            });

            items.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
            return limite ? items.slice(0, limite) : items;
        }
    };

    /* ---------- API pública ---------- */

    global.Store = {
        CATEGORIAS: CATEGORIAS,
        COLORES: COLORES,
        ICONOS: ICONOS,
        estado: function () { return estado; },
        suscribir: suscribir,
        acciones: acciones,
        sel: selectores,
        almacenamientoDisponible: almacenamientoDisponible
    };

})(window);
