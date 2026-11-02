# Documentación de Arquitectura de Software - Sistema FIA 2026 (Equipo Azul)

## 1. Visión General
El presente proyecto implementa el **Sistema Integral de Calendario Deportivo y Gestión del Campeonato Mundial de la FIA** para las categorías Fórmula 1, Fórmula 2, Fórmula 3 y F1 Academy, correspondiente a la entrega del **Sprint 0 / Sprint 1** para la cátedra de Administración de Proyectos de Software (APS - UNS 2026).

---

## 2. Arquitectura en Capas (Layered Architecture)

La aplicación sigue una rigurosa arquitectura en 5 capas desacopladas:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CAPA DE PRESENTACIÓN (Views & UI Components)             │
│    - NavbarView, CalendarView, ScoreView                    │
│    - CompetitionManagementView, UserManagementView          │
│    - ModalManager, ToastNotification, DateFormatter         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Eventos y llamadas)
┌──────────────────────────────▼──────────────────────────────┐
│ 2. CAPA DE CONTROLADORES (MVC Controllers)                  │
│    - CalendarController, ScoreController                    │
│    - CompetitionManagementController                        │
│    - UserManagementController                               │
│    - AuthController, AppController                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Invocación de lógica de negocio)
┌──────────────────────────────▼──────────────────────────────┐
│ 3. CAPA DE SERVICIOS / NEGOCIO (Domain Services)            │
│    - CalendarService, ScoreService                          │
│    - CompetitionProfileService, TechnicalInspectionService  │
│    - UserService, AuthService, SanctionService              │
│    - Estrategias de Puntuación (F1ScoringStrategy, etc.)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (CRUD y Consultas)
┌──────────────────────────────▼──────────────────────────────┐
│ 4. CAPA DE ACCESO A DATOS / PERSISTENCIA (Repositories)     │
│    - BaseRepository<T>, EventRepository, ScoreRepository   │
│    - TeamRepository, DriverRepository, CarRepository        │
│    - TechnicalInspectionRepository, SanctionRepository     │
│    - UserRepository                                         │
│    - StorageService (LocalStorage + Mock Dataset 2026)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Instanciación de entidades)
┌──────────────────────────────▼──────────────────────────────┐
│ 5. CAPA DE DOMINIO / MODELOS (Domain Entities)              │
│    - BaseEntity, User (AdminFIA, AdminEscuderia, PublicUser)│
│    - SportEvent (TireTestEvent), Team, Driver, Car          │
│    - RaceResult, TechnicalInspection, Sanction              │
└─────────────────────────────────────────────────────────────┘
```

### Autenticación y gestión de usuarios (US 23)

`AuthService` valida las credenciales (SHA-256 de `email:password`) conservando el identificador de sesión en `localStorage`. `UserService` restringe la creación, modificación y eliminación de cuentas exclusivamente al personal administrativo de la FIA (`AdminFIA`). Las cuentas permitidas son únicamente para responsables de escuderías (`ADMIN_ESCUDERIA`) y personal de la FIA (`ADMIN_FIA`), bloqueando la creación de perfiles no autorizados. Los usuarios registrados pueden iniciar sesión de inmediato con sus credenciales y acceder a sus vistas específicas.

### Gestión de perfiles e inspecciones

`CompetitionProfileService` autoriza las operaciones de perfiles al personal FIA y conserva el historial al archivar equipos o pilotos. La eliminación permanente elimina solamente el perfil seleccionado y sus resultados directamente asociados. `TechnicalInspectionService` mantiene registros fechados por auto con tipo y resultado controlados; la vista permite navegar de la lista de autos a sus inspecciones y al detalle individual. Todos los roles autenticados pueden consultar; solo FIA puede modificar estos datos.

---

## 3. Principios SOLID Aplicados en el Código

### **S - Single Responsibility Principle (Principio de Responsabilidad Única)**
- **Entidades de Dominio** (`User.js`, `AdminFIA.js`, `AdminEscuderia.js`, `SportEvent.js`, `Driver.js`): Únicamente encapsulan el estado y las reglas intrínsecas del modelo.
- **Repositorios** (`UserRepository.js`, `EventRepository.js`, `ScoreRepository.js`): Únicamente se encargan de la persistencia y recuperación de datos, protegiendo los hashes de contraseñas.
- **Servicios** (`UserService.js`, `AuthService.js`, `CalendarService.js`, `ScoreService.js`): Contienen exclusivamente la lógica y reglas del negocio (permisos de creación, validación de formatos, unicidad, hashing).
- **Vistas** (`UserManagementView.js`, `CalendarView.js`, `ScoreView.js`): Solo generan la estructura HTML y manipulan el DOM.
- **Controladores** (`UserManagementController.js`, `CalendarController.js`): Coordinan la vista y el servicio sin mezclar lógica de negocio.

### **O - Open/Closed Principle (Principio de Abierto/Cerrado)**
- El sistema de cálculo de puntajes utiliza el patrón **Strategy** a través de `IScoringStrategy`. Se pueden añadir reglas de puntuación para otras categorías (F2, F3, F1 Academy, Sprint Races) sin modificar la clase `ScoreService`.
- La clase genérica `BaseRepository` puede ser extendida por nuevos repositorios sin alterar el código base de persistencia.

### **L - Liskov Substitution Principle (Principio de Sustitución de Liskov)**
- `AdminFIA`, `AdminEscuderia` y `PublicUser` heredan de `User`. Cualquier componente que trabaje con `User` puede recibir cualquier subtipo sin fallar.
- `TireTestEvent` hereda de `SportEvent` y puede ser procesado por el calendario y filtros de manera transparente.

### **I - Interface Segregation Principle (Principio de Segregación de Interfaces)**
- Las responsabilidades de los servicios están divididas en interfaces/clases pequeñas y focalizadas. Un controlador de usuarios solo interactúa con `UserService` y `TeamRepository`.

### **D - Dependency Inversion Principle (Principio de Inversión de Dependencias)**
- Todos los controladores reciben sus dependencias (servicios, vistas, repositorios) inyectadas en su constructor (`AppController` actúa como contenedor de Inyección de Dependencias).
- `UserService` y `ScoreService` dependen de abstracciones de repositorio, no de almacenamiento rígido acoplado.

---

## 4. Patrones de Diseño Implementados
1. **MVC (Model - View - Controller)**: Separación estricta de responsabilidades.
2. **Repository Pattern**: Abstracción del almacenamiento persistente.
3. **Strategy Pattern**: Cálculo extensible de puntajes según normativa deportiva.
4. **Observer / PubSub Pattern (`EventEmitter`)**: Comunicación reactiva y desacoplada entre controladores y servicios ante cambios de sesión y datos (`users:updated`, `auth:userChanged`).
5. **Dependency Injection / Factory**: Configuración centralizada en `AppController`.
