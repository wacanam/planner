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

export enum RotationStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('territory_rotations')
export class TerritoryRotation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  territoryId!: string;

  @ManyToOne('Territory', 'rotations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'territoryId' })
  territory!: Territory;

  /** The user who worked the territory in this rotation */
  @Column({ type: 'uuid', nullable: true })
  assignedUserId?: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser?: User;

  @Column({ type: 'varchar', length: 50, default: RotationStatus.ACTIVE })
  status!: RotationStatus;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedDate?: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  coverageAchieved!: number;

  @Column({ type: 'int', default: 0 })
  visitsMade!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
