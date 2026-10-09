# Mapeo y Complemento del Diagrama de Clases - FIA 2026

El siguiente esquema detalla las clases presentes en el diagrama conceptual suministrado, complementadas con los atributos requeridos para el cumplimiento completo del Enunciado 1 de la FIA (gestión de categorías F1/F2/F3/F1 Academy, pruebas de neumáticos y roles de usuario).

---

## 1. Diagrama de Clases (Mermaid)

```mermaid
classDiagram
    class BaseEntity {
        +UUID id
        +DateTime createdAt
        +DateTime updatedAt
        +touch() void
        +toJSON() Object
    }

    class Usuario {
        +String nombre
        +String email
        +USER_ROLES rol
        +String avatar
        +Boolean activo
        +canManageCalendar() Boolean
        +canManageScores() Boolean
        +canAcknowledgeNotifications() Boolean
    }

    class AdminFIA {
        +String cargo
        +String departamento
        +String licenciaFIA
    }

    class AdminEscuderia {
        +UUID escuderiaId
        +String escuderiaNombre
        +String cargoEquipo
        +isAuthorizedForTeam(teamId) Boolean
    }

    class UsuarioPublicoGeneral {
        +String escuderiaFavorita
        +Boolean recibirAlertas
    }

    BaseEntity <|-- Usuario
    Usuario <|-- AdminFIA
    Usuario <|-- AdminEscuderia
    Usuario <|-- UsuarioPublicoGeneral

    class EventoDeportivo {
        +String nombre
        +FIA_CATEGORIES categoria
        +String circuito
        +String ciudad
        +String pais
        +String banderaPais
        +Date fechaInicio
        +Date fechaFin
        +EVENT_TYPES tipoEvento
        +EVENT_STATUS estado
        +Number roundNumero
        +Number vueltas
        +Number distanciaKm
        +Number longitudCircuitoKm
        +String recordVuelta
        +String recordPiloto
        +String descripcion
        +Boolean puntajesRegistrados
        +validate() ValidationResult
    }

    class PruebaNeumatico {
        +String proveedorOficial
        +Array compuestosEvaluados
        +String objetivoPrueba
        +Number temperaturaPistaObjetivoC
        +Array escuderiasParticipantes
    }

    BaseEntity <|-- EventoDeportivo
    EventoDeportivo <|-- PruebaNeumatico

    class Escuderia {
        +String nombre
        +String nombreCompleto
        +String pais
        +String sede
        +String directorEquipo
        +String directorTecnico
        +String chasis
        +String unidadPotencia
        +String colorPrimario
        +Number puntosTotales
        +Number posicionCampeonato
        +Boolean activo
        +addPoints(pts) void
    }

    class Piloto {
        +String nombre
        +String apellido
        +Number numero
        +String sigla
        +String nacionalidad
        +UUID escuderiaId
        +String escuderiaNombre
        +DRIVER_ROLES rol
        +Date fechaNacimiento
        +Number puntos
        +Number victorias
        +Number podios
        +getNombreCompleto() String
    }

    class Auto {
        +Number numeroAuto
        +String modelo
        +String chasisCodigo
        +String motorCodigo
        +UUID escuderiaId
        +UUID pilotoId
        +Number pesoKg
        +CAR_STATUS estado
    }

    class InspeccionTecnica {
        +UUID autoId
        +Date fecha
        +INSPECTION_TYPES tipoInspeccion
        +INSPECTION_OUTCOMES resultado
        +String observaciones
    }

    class Puntaje {
        +UUID eventoId
        +UUID pilotoId
        +UUID escuderiaId
        +Number posicion
        +String tiempoTotal
        +Number puntos
        +Number puntosEscuderia
        +Boolean vueltaRapida
        +RACE_STATUS estadoFinal
        +Boolean notificadoEscuderia
        +DateTime fechaNotificacion
        +acknowledgePoints() void
    }

    BaseEntity <|-- Escuderia
    BaseEntity <|-- Piloto
    BaseEntity <|-- Auto
    BaseEntity <|-- InspeccionTecnica
    BaseEntity <|-- Puntaje

    Escuderia "1" o-- "*" Auto : posee
    Escuderia "1" o-- "*" Piloto : contrata
    Auto "1" o-- "*" InspeccionTecnica : registra inspecciones
    EventoDeportivo "1" <-- "*" Puntaje : tiene resultados
    Piloto "1" <-- "*" Puntaje : obtiene
```

---

## 2. Complementos Realizados a las Clases del Diagrama
1. **`EventoDeportivo`**: Se incorporaron atributos de metadatos de carrera (`distanciaKm`, `vueltas`, `longitudCircuitoKm`, `recordVuelta`, `recordPiloto`, `banderaPais`, `puntajesRegistrados`) y validación de negocio.
2. **`PruebaNeumatico`**: Especialización de `EventoDeportivo` con atributos reglamentarios de Pirelli Motorsport (`compuestosEvaluados`, `proveedorOficial`, `temperaturaPistaObjetivoC`).
3. **`Piloto`**: Se añadió el atributo `rol` (`Titular` / `Suplente / Reserva`) para cumplir explícitamente con el requerimiento de carga de pilotos de las escuderías.
4. **`Puntaje`**: Se integraron los atributos de trazabilidad legal de notificación (`notificadoEscuderia`, `fechaNotificacion`), requeridos por la FIA y el esquema oficial de puntuación 2026 (sin bonificación por vuelta rápida).
