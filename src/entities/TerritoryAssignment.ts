import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Territory } from './Territory';
import type { User } from './User';
import type { ServiceGroup } from './ServiceGroup';

export enum AssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  RETURNED = 'returned',
}

@Entity('territory_assignments')
export class TerritoryAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  territoryId!: string;

  @ManyToOne('Territory', 'assignments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'territoryId' })
  territory!: Territory;

  /** Assigned to an individual user (optional) */
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  /** OR assigned to a service group (optional) */
  @Column({ type: 'uuid', nullable: true })
  serviceGroupId?: string;

  @ManyToOne('ServiceGroup', 'assignments', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'serviceGroupId' })
  serviceGroup?: ServiceGroup;

  @Column({ type: 'varchar', length: 50, default: AssignmentStatus.ACTIVE })
  status!: AssignmentStatus;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  coverageAtAssignment!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
