# Mapeo y Complemento del Diagrama de Clases - FIA 2026

El siguiente esquema detalla las clases presentes en el diagrama conceptual suministrado, complementadas con los atributos requeridos para el cumplimiento completo del Enunciado 1 de la FIA (gestión de categorías F1/F2/F3/F1 Academy, pruebas de neumáticos, roles de usuario, controles técnicos, sanciones y mensajería interna).

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
        +canManageDrivers() Boolean
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

    class ControlTecnico {
        +Date fecha
        +UUID eventoId
        +UUID autoId
        +Number autoNumero
        +UUID escuderiaId
        +CONTROL_TYPES tipoControl
        +CONTROL_STATUS estado
        +Boolean aprobado
        +String mediciones
        +String comisarioTecnico
        +String observaciones
    }

    class Sancion {
        +Date fecha
        +UUID eventoId
        +UUID pilotoId
        +UUID escuderiaId
        +SANCTION_TYPES tipoSancion
        +String valorPenalidad
        +SANCTION_SEVERITY gravedad
        +String motivo
        +String articuloReglamento
        +Boolean notificadoEscuderia
        +DateTime fechaNotificacion
        +String responsableNotificacion
        +acknowledgeNotification(resp) void
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

    class Conversacion {
        +String asunto
        +String categoria
        +UUID participanteFIAId
        +UUID escuderiaId
        +String escuderiaNombre
        +CONVERSATION_STATUS estado
        +Number mensajesCount
        +String ultimoMensajeTexto
        +DateTime ultimoMensajeFecha
    }

    class Mensaje {
        +UUID conversacionId
        +UUID emisorId
        +String emisorNombre
        +String emisorRol
        +DateTime timestamp
        +String cuerpo
        +MESSAGE_PRIORITY prioridad
        +Boolean leido
    }

    BaseEntity <|-- Escuderia
    BaseEntity <|-- Piloto
    BaseEntity <|-- Auto
    BaseEntity <|-- ControlTecnico
    BaseEntity <|-- Sancion
    BaseEntity <|-- Puntaje
    BaseEntity <|-- Conversacion
    BaseEntity <|-- Mensaje

    Escuderia "1" o-- "*" Auto : posee
    Escuderia "1" o-- "*" Piloto : contrata
    Auto "1" <-- "*" ControlTecnico : auditado por
    EventoDeportivo "1" <-- "*" Puntaje : tiene resultados
    Piloto "1" <-- "*" Puntaje : obtiene
    Piloto "0..1" <-- "*" Sancion : recibe
    Escuderia "1" <-- "*" Sancion : notificada
    Usuario "1" <-- "*" Conversacion : participa
    Conversacion "1" *-- "*" Mensaje : contiene
```

---

## 2. Complementos Realizados a las Clases del Diagrama
1. **`EventoDeportivo`**: Se incorporaron atributos de metadatos de carrera (`distanciaKm`, `vueltas`, `longitudCircuitoKm`, `recordVuelta`, `recordPiloto`, `banderaPais`, `puntajesRegistrados`) y validación de negocio.
2. **`PruebaNeumatico`**: Especialización de `EventoDeportivo` con atributos reglamentarios de Pirelli Motorsport (`compuestosEvaluados`, `proveedorOficial`, `temperaturaPistaObjetivoC`).
3. **`Piloto`**: Se añadió el atributo `rol` (`Titular` / `Suplente / Reserva`) para cumplir explícitamente con el requerimiento de carga de pilotos de las escuderías.
4. **`ControlTecnico`**: Se añadieron `mediciones`, `comisarioTecnico` y `tipoControl` (peso mínimo, alerón, combustible, desgaste de plancha).
5. **`Sancion`** y **`Puntaje`**: Se integraron los atributos de trazabilidad legal de notificación (`notificadoEscuderia`, `fechaNotificacion`, `responsableNotificacion`), requeridos por la FIA.
6. **`Conversacion`** y **`Mensaje`**: Se implementó con `prioridad`, `timestamp`, `emisorRol` y seguridad TLS simulada.
