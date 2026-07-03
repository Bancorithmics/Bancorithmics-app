# 💰 Bancorithmics

Bancorithmics es una aplicación enfocada en la gestión de recursos financieros personales, permitiendo al usuario administrar ingresos, egresos, ahorros y visualizar el estado de sus finanzas mediante una interfaz gráfica intuitiva.

---

## 📌 Objetivo

Facilitar el control del dinero personal mediante herramientas que permitan registrar, consultar, actualizar y organizar los recursos financieros de manera sencilla.

---

## 🚀 Funcionalidades

### 🎨 Interfaz Gráfica (UI/UX)
- Diseño intuitivo y fácil de usar.
- Navegación sencilla entre los diferentes módulos.

---

## 📊 Gestión de Recursos

Es el módulo principal de la aplicación y contiene las siguientes funcionalidades:

### 💵 CRUD de Dinero

Permite administrar el dinero almacenado en el sistema.

Funciones:
- ➕ Añadir dinero.
- 📖 Leer dinero disponible.
- ✏️ Actualizar dinero.
- 🗄️ Actualizar la base de datos automáticamente.

---

### 🛏️ Colchón

Permite separar una parte del dinero como fondo de ahorro o emergencia.

Características:
- Ingresar dinero desde la cuenta principal al colchón.
- Mantener separado el dinero destinado al ahorro.

---

### 📈 Gestión de Ingresos y Egresos

Permite llevar el registro de los movimientos financieros.

Funciones:
- Registrar ingresos.
- Registrar egresos.
- Agregar o quitar dinero según corresponda.

---

### 📊 Visualizador de Dinero

Muestra el estado financiero del usuario mediante tablas.

Información disponible:
- Ingresos.
- Egresos.
- Montos.
- Cantidades.

---

### 👛 Bolsillos

Sistema para organizar el dinero en diferentes categorías.

Ejemplos:
- Transporte.
- Alimentación.
- Entretenimiento.
- Emergencias.
- Ahorros.

---

## 🏗️ Arquitectura General

```
Bancorithmics
│
├── Interfaz gráfica (UI/UX)
│
└── Gestión de Recursos
    ├── CRUD de Dinero
    │   ├── Añadir dinero
    │   ├── Leer dinero
    │   ├── Actualizar dinero
    │   └── Actualizar Base de Datos
    │
    ├── Colchón
    │   └── Transferencia desde la cuenta principal
    │
    ├── Gestión de ingresos y egresos
    │   └── Registrar movimientos
    │
    ├── Visualizador de dinero
    │   └── Tablas y reportes
    │
    └── Bolsillos
        └── Organización del dinero por categorías
```

---

## 🛠️ Tecnologías (Sugeridas)

- Frontend: HTML, CSS, JavaScript
- Backend: Python / Java / Node.js
- Base de datos: MySQL o PostgreSQL
- Control de versiones: Git y GitHub

---

## 📈 Futuras mejoras

- Gráficas estadísticas.
- Presupuestos mensuales.
- Metas de ahorro.
- Autenticación de usuarios.
- Exportación de reportes en PDF y Excel.
- Notificaciones de gastos.
- Sincronización en la nube.

---

## 👨‍💻 Autor

**Andres Felipe Collazos Fernandez**
&
**Diego Fernando Mera Barrera**

Proyecto académico — **Bancorithmics**.
