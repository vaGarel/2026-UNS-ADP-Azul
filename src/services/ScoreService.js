import { RaceResult, RACE_STATUS } from '../models/RaceResult.js';
import { F1ScoringStrategy } from './strategies/F1ScoringStrategy.js';

/**
 * Servicio de Negocio para Registro y Gestión de Puntajes (US 07)
 * Aplica DIP inyectando la estrategia de puntuación
 */
export class ScoreService {
  constructor(
    scoreRepository,
    eventRepository,
    teamRepository,
    driverRepository,
    authService,
    eventEmitter,
    scoringStrategy = new F1ScoringStrategy()
  ) {
    this.scoreRepository = scoreRepository;
    this.eventRepository = eventRepository;
    this.teamRepository = teamRepository;
    this.driverRepository = driverRepository;
    this.authService = authService;
    this.eventEmitter = eventEmitter;
    this.scoringStrategy = scoringStrategy;
  }

  getResultsByEvent(eventId) {
    return this.scoreRepository.getByEvent(eventId);
  }

  getAllResults() {
    return this.scoreRepository.getAll();
  }

  registerRaceScore(resultData) {
    this._assertCanManageScores();

    const {
      eventoId,
      pilotoId,
      escuderiaId,
      posicion,
      tiempoTotal = '',
      vueltaRapida = false,
      estadoFinal = RACE_STATUS.FINISHED
    } = resultData;

    if (!eventoId || !pilotoId || !escuderiaId) {
      throw new Error('Evento, Piloto y Escudería son campos obligatorios.');
    }

    const event = this.eventRepository.getById(eventoId);
    if (!event) throw new Error(`Evento con ID ${eventoId} no existe.`);

    const driver = this.driverRepository.getById(pilotoId);
    if (!driver) throw new Error(`Piloto con ID ${pilotoId} no existe.`);

    const team = this.teamRepository.getById(escuderiaId);
    if (!team) throw new Error(`Escudería con ID ${escuderiaId} no existe.`);

    // Calcular puntaje según estrategia oficial FIA
    const isFinished = estadoFinal === RACE_STATUS.FINISHED;
    const pointsCalculated = this.scoringStrategy.calculatePoints(posicion, Boolean(vueltaRapida), isFinished);

    // Comprobar si ya existe un puntaje registrado para este piloto en este evento
    const existing = this.scoreRepository.findOne(r => r.eventoId === eventoId && r.pilotoId === pilotoId);

    let savedResult;
    if (existing) {
      savedResult = this.scoreRepository.update(existing.id, {
        posicion: Number(posicion),
        tiempoTotal,
        puntos: pointsCalculated,
        puntosEscuderia: pointsCalculated,
        vueltaRapida: Boolean(vueltaRapida),
        estadoFinal,
        notificadoEscuderia: false, // Reset notification on score update
        fechaNotificacion: null
      });
    } else {
      const newResult = new RaceResult({
        eventoId,
        eventoNombre: event.nombre,
        pilotoId,
        pilotoNombre: driver.getNombreCompleto(),
        pilotoNumero: driver.numero,
        escuderiaId,
        escuderiaNombre: team.nombre,
        posicion: Number(posicion),
        tiempoTotal,
        puntos: pointsCalculated,
        puntosEscuderia: pointsCalculated,
        vueltaRapida: Boolean(vueltaRapida),
        estadoFinal,
        notificadoEscuderia: false
      });
      savedResult = this.scoreRepository.create(newResult);
    }

    // Actualizar estado del evento a puntajes registrados
    this.eventRepository.update(eventoId, { puntajesRegistrados: true });

    // Recalcular acumulados del campeonato
    this._recalculateChampionshipStandings();

    this.eventEmitter.emit('scores:updated', { eventId, result: savedResult });
    return savedResult;
  }

  acknowledgeScoreNotification(scoreId) {
    const user = this.authService.getCurrentUser();
    if (!user || (!user.isAdminEscuderia() && !user.isAdminFIA())) {
      throw new Error('Permiso denegado: Solo el responsable de la escudería puede asentar la notificación del puntaje.');
    }

    const score = this.scoreRepository.getById(scoreId);
    if (!score) throw new Error('Registro de puntaje no encontrado.');

    if (user.isAdminEscuderia() && !user.isAuthorizedForTeam(score.escuderiaId)) {
      throw new Error(`Permiso denegado: No pertenece a la escudería ${score.escuderiaNombre}.`);
    }

    const updated = this.scoreRepository.update(scoreId, {
      notificadoEscuderia: true,
      fechaNotificacion: new Date().toISOString()
    });

    this.eventEmitter.emit('scores:acknowledged', { scoreId, updated });
    return updated;
  }

  _recalculateChampionshipStandings() {
    const allResults = this.scoreRepository.getAll();
    const drivers = this.driverRepository.getAll();
    const teams = this.teamRepository.getAll();

    // Reset points
    const driverPointsMap = {};
    const teamPointsMap = {};

    drivers.forEach(d => { driverPointsMap[d.id] = 0; });
    teams.forEach(t => { teamPointsMap[t.id] = 0; });

    allResults.forEach(res => {
      if (driverPointsMap[res.pilotoId] !== undefined) {
        driverPointsMap[res.pilotoId] += res.puntos;
      }
      if (teamPointsMap[res.escuderiaId] !== undefined) {
        teamPointsMap[res.escuderiaId] += res.puntosEscuderia;
      }
    });

    drivers.forEach(d => {
      this.driverRepository.update(d.id, { puntos: driverPointsMap[d.id] || 0 });
    });

    teams.forEach(t => {
      this.teamRepository.update(t.id, { puntosTotales: teamPointsMap[t.id] || 0 });
    });
  }

  _assertCanManageScores() {
    const user = this.authService.getCurrentUser();
    if (!user || !user.canManageScores()) {
      throw new Error('Permiso denegado: Solo el personal Administrativo de la FIA puede cargar o modificar puntajes.');
    }
  }
}
