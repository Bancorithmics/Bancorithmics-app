# 💰 Bancorithmics

Bancorithmics es una aplicación enfocada en la gestión de recursos financieros personales, permitiendo al usuario administrar ingresos, egresos, ahorros y visualizar el estado de sus finanzas mediante una interfaz gráfica intuitiva.

---

## 🚀 Cómo ejecutarla

No necesita servidor ni instalación: **abre `index.html` en el navegador**.

Todo funciona con HTML, CSS y JavaScript puro (sin librerías externas). Los datos se
guardan en el `localStorage` del navegador, así que se conservan al cerrar la página.
La primera vez que se abre se cargan datos de ejemplo para poder probar la aplicación.

---

## 📌 Objetivo

Facilitar el control del dinero personal mediante herramientas que permitan registrar, consultar, actualizar y organizar los recursos financieros de manera sencilla.

---

## 🧭 Módulos

| Página | Archivo | Qué hace |
|---|---|---|
| Inicio | `index.html` | Resumen: saldo, colchón, ingresos y egresos del mes, reparto del patrimonio, últimos movimientos, bolsillos y avisos automáticos |
| Ingresos y Egresos | `money.html` | CRUD completo de movimientos, con búsqueda, filtros por tipo/mes/categoría, orden y paginación |
| Bolsillos | `bolsillos.html` | Crear, editar y eliminar bolsillos; guardar y sacar dinero; metas por bolsillo |
| Colchón | `colchon.html` | Fondo de emergencia: ingresar, retirar, meta sugerida según tus gastos e historial |
| Reportes | `reportes.html` | Gráfica de ingresos vs. egresos por mes, reparto por categoría y mayores movimientos |
| Metas | `metas.html` | Todas las metas (colchón + bolsillos) con su avance y una estimación de cuánto falta |
| Configuración | `configuracion.html` | Perfil, tema claro/oscuro, moneda, exportar/importar copia y borrar datos |

---

## 📊 Gestión de Recursos

### 💵 CRUD de Dinero
- ➕ Registrar ingresos y egresos.
- 📖 Consultar el dinero disponible y el patrimonio total.
- ✏️ Editar y eliminar movimientos (los saldos se recalculan solos).
- 🗄️ Guardado automático en el navegador tras cada cambio.

### 🛏️ Colchón
- Transferir dinero desde la cuenta principal al colchón y de vuelta.
- Meta sugerida automáticamente: 6 meses de tus gastos promedio.
- Historial de entradas y salidas del fondo.

### 📈 Ingresos y Egresos
- Categorías predefinidas para ingresos y egresos.
- Cada movimiento puede afectar el saldo disponible, el colchón o un bolsillo concreto.
- Validación de fondos: no se puede gastar dinero que no existe.

### 📊 Visualizador de Dinero
- Tabla con concepto, categoría, tipo, monto y fecha.
- Búsqueda por texto, filtros por tipo, mes y categoría, orden por columna y paginación.
- Reportes con gráficas de barras y de dona, más una vista alternativa en tabla.

### 👛 Bolsillos
- Organizar el dinero por categorías: transporte, alimentación, entretenimiento, emergencias, ahorros…
- Color, icono y meta configurables por bolsillo.
- Al eliminar un bolsillo su dinero regresa al saldo disponible.

---

## 🏗️ Arquitectura

La aplicación separa los datos de la interfaz: toda operación de dinero pasa por el
*store*, que valida, actualiza los saldos y avisa a las vistas para que se repinten.

```
Bancorithmics
│
├── js/store.js            → Datos y reglas de negocio (fuente única de verdad)
│   ├── estado             → saldo, colchón, bolsillos, movimientos, transferencias
│   ├── acciones           → agregar/editar/eliminar, transferir, crear bolsillo...
│   ├── selectores         → totales, resúmenes por mes, agrupación por categoría
│   └── localStorage       → guardado y recuperación automáticos
│
├── js/ui.js               → Utilidades compartidas
│   ├── formato de dinero y fechas
│   ├── menú lateral, tema claro/oscuro, menú móvil
│   └── modales, confirmaciones, notificaciones (toasts)
│
├── js/form-movimiento.js  → Formulario de ingreso/egreso reutilizable
│
├── js/<página>.js         → Una vista por página (dashboard, movimientos,
│                            bolsillos, colchón, reportes, metas, configuración)
│
└── style.css + paginas.css + bolsillos.css → Diseño y componentes
```

**Cómo fluye un cambio:** la vista llama a una acción → el store valida y actualiza
el estado → guarda en `localStorage` → notifica a los suscriptores → cada vista se
repinta con los datos nuevos. Si la operación no es válida (fondos insuficientes,
monto en cero, nombre repetido), la acción lanza un error con un mensaje en español
que la vista muestra al usuario.

---

## ♿ Accesibilidad y detalles de UX

- Menú lateral desplegable en móvil, navegación por teclado y foco visible.
- Modales que se cierran con `Esc` o clic fuera, y que atrapan el tabulador.
- Los colores de las gráficas fueron verificados para daltonismo y contraste, y
  además de color siempre hay leyenda, etiqueta y una vista de tabla.
- Respeta la preferencia del sistema de reducir animaciones.

---

## 🛠️ Tecnologías

- HTML5, CSS3 (variables, grid y flexbox) y JavaScript sin dependencias.
- Persistencia con `localStorage`.
- Control de versiones: Git y GitHub.

---

## 📈 Futuras mejoras

- Presupuestos mensuales por categoría.
- Movimientos recurrentes (salario, arriendo, suscripciones).
- Autenticación de usuarios y sincronización en la nube.
- Exportación de reportes en PDF y Excel.

---

## 👨‍💻 Autores

**Andres Felipe Collazos Fernandez**
&
**Diego Fernando Mera Barrera**

Proyecto académico — **Bancorithmics**.
