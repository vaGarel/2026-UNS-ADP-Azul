# FIA Sports Calendar & Championship Management System 🏎️🏁
### Sistema Integral de Gestión de Calendario Deportivo Oficial FIA 2026
**Administración de Proyectos de Software (APS) – Segundo Cuatrimestre 2026**  
**Universidad Nacional del Sur (UNS)**  
**Comisión:** Equipo Azul

---

## 📋 Descripción del Proyecto

El sistema es una plataforma web desarrollada para la **Federación Internacional del Automóvil (FIA)** que permite gestionar todas sus categorías de monoplazas (**Fórmula 1, Fórmula 2, Fórmula 3 y F1 Academy**). La plataforma centraliza el calendario oficial de carreras y pruebas de neumáticos, los puntajes del campeonato, el registro de escuderías y pilotos, los controles técnicos y las sanciones reglamentarias, adaptando su interfaz según los diferentes roles de usuario (**Administrativos de la FIA, Administrativos de Escuderías y Público General**).

Esta entrega corresponde a la **Demo CRUD del Sprint 0**, implementada íntegramente en JavaScript con **Arquitectura en Capas**, principios **SOLID** y el patrón **MVC (Modelo - Vista - Controlador)**.

---

## 🏛️ Principios de Diseño y Arquitectura

### 1. Arquitectura en Capas (Layered Architecture)
- **Capa de Presentación (Views & UI Components):** [src/views/](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/views)
- **Capa de Controladores (MVC Controllers):** [src/controllers/](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/controllers)
- **Capa de Negocio / Servicios:** [src/services/](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/services)
- **Capa de Acceso a Datos / Repositorios:** [src/repositories/](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/repositories)
- **Capa de Dominio / Entidades:** [src/models/](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/models)

### 2. Principios SOLID Aplicados
- **S (Single Responsibility):** Cada clase tiene una responsabilidad única y delimitada (validación de modelos, persistencia, cálculo de puntajes, manipulación del DOM, coordinación).
- **O (Open/Closed):** Patrón Strategy en `IScoringStrategy` ([F1ScoringStrategy](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/services/strategies/F1ScoringStrategy.js), [F2ScoringStrategy](file:///c:/Users/sanhe/OneDrive/Desktop/UNS/APS/Poyecto/2026-UNS-ADP-Azul/src/services/strategies/F2ScoringStrategy.js)) y repositorios genéricos `BaseRepository<T>`.
- **L (Liskov Substitution):** Jerarquías polimórficas (`AdminFIA`, `AdminEscuderia`, `PublicUser` heredan de `User`; `TireTestEvent` hereda de `SportEvent`).
- **I (Interface Segregation):** Servicios e interfaces de grano fino y desacoplados.
- **D (Dependency Inversion):** Los controladores y servicios reciben sus dependencias inyectadas por constructor mediante el DI Container en `AppController`.

---

## ✨ Funcionalidades Principales de la Demo

1. **Gestión de Calendario Deportivo (US 04 - CRUD Completo):**
   - Alta, modificación y eliminación de Grandes Premios, carreras sprint y pruebas oficiales de neumáticos (Pirelli).
   - Filtros dinámicos por categoría (F1, F2, F3, F1 Academy) y por tipo de evento.
   - Búsqueda en tiempo real por circuito, país o ciudad.
   - Alternador de vistas (Vista en Tarjetas / Cuadrícula y Vista en Tabla cronológica).
   - Ficha técnica completa de cada autódromo con vueltas, distancia y especificaciones.
   - **Exportación y descarga del calendario:** Formato estándar iCalendar (`.ics`) para Google Calendar / Outlook y formato `.json`.

2. **Carga y Registro de Puntajes Oficiales (US 07):**
   - Formulario para ingreso de resultados de carrera por personal FIA con validación de pilotos y escuderías.
   - Cálculo automático de puntos según el reglamento FIA (25-18-15-12-10-8-6-4-2-1 + 1 pt por Vuelta Rápida en el Top 10).
   - Tablas actualizadas del Campeonato Mundial de Pilotos y de Constructores.
   - Botón interactivo para que las escuderías puedan **asentar formalmente que se han notificado del puntaje recibido** con fecha y hora.

3. **Registro de Escuderías y Pilotos (Titulares y Suplentes):**
   - Administración de pilotos titulares y reservas.
   - Vinculación con monoplazas y directores de equipo.
   - Estadísticas de victorias, podios y puntos.

4. **Controles Técnicos Oficiales:**
   - Registro de verificaciones en parque cerrado (peso mínimo, alerón delantero, combustible, desgaste de plancha de fondo).
   - Dictamen de Aprobado / Rechazado visible para escuderías y aficionados.

5. **Registro de Sanciones y Penalizaciones:**
   - Publicación de resoluciones de comisarios deportivos (penalizaciones de tiempo, grilla, multas económicas, DSQ).
   - Sistema de firma digital / asentamiento de notificación por parte de las escuderías.

6. **Mensajería Interna Segura (FIA ↔ Escuderías):**
   - Canales oficiales de comunicación con prioridad urgente y trazabilidad.

7. **Selector Dinámico de Roles (Demo Tool):**
   - Botón en la barra superior que permite alternar en 1 clic entre **Admin FIA**, **Admin Escudería (Ferrari / Red Bull)** y **Público General**, permitiendo verificar de inmediato los permisos y restricciones de cada rol.

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

### Opción 1: Con Servidor de Desarrollo Vite (Recomendado)
```bash
# 1. Posicionarse en el directorio del proyecto
cd 2026-UNS-ADP-Azul

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor local de desarrollo
npm run dev
```
Luego abrir la URL indicada en la terminal (usualmente `http://localhost:5173`).

### Opción 2: Con cualquier Servidor Estático Local (Python, Live Server, etc.)
Al estar construido con módulos nativos ES6 (`<script type="module">`), se puede servir con cualquier servidor web:
```bash
# Ejemplo con Python 3:
python -m http.server 8000
```
Y abrir `http://localhost:8000` en el navegador.

---

## 📁 Estructura del Proyecto

```
2026-UNS-ADP-Azul/
├── index.html                  # Página web principal
├── package.json                # Configuración y scripts
├── README.md                   # Documentación principal
├── docs/                       # Documentación técnica
│   ├── ARCHITECTURE.md         # Arquitectura en capas y SOLID
│   └── CLASS_DIAGRAM.md        # Diagrama de clases y atributos
├── css/                        # Sistema de diseño y hojas de estilo
│   ├── main.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── calendar.css
│   ├── scores.css
│   ├── teams.css
│   ├── sanctions.css
│   ├── messages.css
│   └── modals.css
└── src/                        # Código fuente modular en JS (ES Modules)
    ├── app.js                  # Entry point
    ├── config/                 # Constantes y datos iniciales (seed 2026)
    │   ├── constants.js
    │   └── seedData.js
    ├── models/                 # Capa de Dominio (Entidades)
    │   ├── BaseEntity.js
    │   ├── User.js (AdminFIA, AdminEscuderia, PublicUser)
    │   ├── SportEvent.js (TireTestEvent)
    │   ├── Team.js
    │   ├── Driver.js
    │   ├── Car.js
    │   ├── TechnicalControl.js
    │   ├── Sanction.js
    │   ├── RaceResult.js
    │   ├── Conversation.js
    │   └── Message.js
    ├── repositories/           # Capa de Acceso a Datos
    │   ├── BaseRepository.js
    │   ├── EventRepository.js
    │   ├── ScoreRepository.js
    │   ├── TeamRepository.js
    │   ├── DriverRepository.js
    │   ├── CarRepository.js
    │   ├── TechnicalControlRepository.js
    │   ├── SanctionRepository.js
    │   ├── UserRepository.js
    │   ├── ConversationRepository.js
    │   └── MessageRepository.js
    ├── services/               # Capa de Lógica de Negocio
    │   ├── StorageService.js
    │   ├── AuthService.js
    │   ├── CalendarService.js
    │   ├── ScoreService.js
    │   ├── TeamDriverService.js
    │   ├── TechnicalControlService.js
    │   ├── SanctionService.js
    │   ├── MessagingService.js
    │   ├── UserAdminService.js
    │   └── strategies/
    │       ├── IScoringStrategy.js
    │       ├── F1ScoringStrategy.js
    │       └── F2ScoringStrategy.js
    ├── controllers/            # Capa de Controladores (MVC)
    │   ├── AppController.js
    │   ├── AuthController.js
    │   ├── CalendarController.js
    │   ├── ScoreController.js
    │   ├── TeamDriverController.js
    │   ├── TechnicalControlController.js
    │   ├── SanctionController.js
    │   ├── MessagingController.js
    │   └── UserAdminController.js
    ├── views/                  # Capa de Vistas (MVC)
    │   ├── BaseView.js
    │   ├── NavbarView.js
    │   ├── CalendarView.js
    │   ├── ScoreView.js
    │   ├── TeamDriverView.js
    │   ├── TechnicalControlView.js
    │   ├── SanctionView.js
    │   ├── MessagingView.js
    │   └── UserAdminView.js
    └── utils/                  # Utilidades transversales
        ├── EventEmitter.js
        ├── ToastNotification.js
        ├── ModalManager.js
        ├── DateFormatter.js
        └── Exporter.js
```
