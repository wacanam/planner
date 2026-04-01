import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Congregation } from './Congregation';
import type { TerritoryAssignment } from './TerritoryAssignment';
import type { TerritoryRotation } from './TerritoryRotation';

export enum TerritoryStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('territories')
export class Territory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  number!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 50, default: TerritoryStatus.AVAILABLE })
  status!: TerritoryStatus;

  @Column({ type: 'int', default: 0 })
  householdsCount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  coveragePercent!: number;

  /** PostGIS polygon — stored as GeoJSON text, projected via raw SQL if needed */
  @Column({ type: 'text', nullable: true })
  boundary?: string;

  @Column({ type: 'uuid' })
  congregationId!: string;

  @ManyToOne('Congregation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregationId' })
  congregation!: Congregation;

  @OneToMany('TerritoryAssignment', 'territory')
  assignments!: TerritoryAssignment[];

  @OneToMany('TerritoryRotation', 'territory')
  rotations!: TerritoryRotation[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
