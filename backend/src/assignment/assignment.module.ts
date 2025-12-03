import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ClusteringService } from './clustering/clustering.service';
import { DriverSelectionService } from './driver-selection/driver-selection.service';
import { RouteOptimizerService } from './route-optimizer/route-optimizer.service';
import { GoogleMapsService } from './route-optimizer/google-maps.service';
import { AssignmentOrchestrator } from './orchestrator/assignment-orchestrator.service';
import { OfferService } from './offer/offer.service';
import { OfferGateway } from './offer/offer.gateway';
import { PersistenceService } from './persistence/persistence.service';

/**
 * Módulo de Asignación de Pedidos.
 *
 * Contiene los servicios para:
 * - FASE A: Clustering de pedidos por cercanía ✅
 * - FASE B: Selección de conductores ✅ (con tracking en tiempo real vía Redis)
 * - FASE C: Optimización de rutas ✅
 * - FASE D: Construcción y envío de ofertas ✅
 * - FASE E: Aceptación y persistencia ✅
 */
@Module({
  imports: [PrismaModule, EventEmitterModule, CommonModule],
  providers: [
    ClusteringService,
    DriverSelectionService,
    RouteOptimizerService,
    GoogleMapsService,
    AssignmentOrchestrator,
    OfferService,
    OfferGateway,
    PersistenceService,
  ],
  exports: [
    ClusteringService,
    DriverSelectionService,
    RouteOptimizerService,
    GoogleMapsService,
    AssignmentOrchestrator,
    OfferService,
    PersistenceService,
  ],
})
export class AssignmentModule {}

