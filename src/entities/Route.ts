import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('routes')
@Index('idx_route_geom', { spatial: true })
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  path?: string; // GeoJSON LineString

  @Column({ type: 'float', nullable: true })
  distanceKm?: number;

  @Column({ type: 'int', nullable: true })
  estimatedMinutes?: number;

  @Column({ type: 'varchar', length: 50, default: 'planned' })
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' = 'planned';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
