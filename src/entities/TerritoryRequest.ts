import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import type { User } from './User';
import type { Congregation } from './Congregation';
import type { Group } from './Group';

export enum TerritoryRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('territory_requests')
export class TerritoryRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  congregationId!: string;

  @Column({ type: 'uuid' })
  publisherId!: string;

  @Column({ type: 'uuid', nullable: true })
  territoryId?: string;

  @Column({ type: 'varchar', length: 20, default: TerritoryRequestStatus.PENDING })
  status!: TerritoryRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date;

  @ManyToOne('Congregation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregationId' })
  congregation!: Congregation;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'publisherId' })
  publisher!: User;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'approvedBy' })
  approver?: User;

  @CreateDateColumn()
  requestedAt!: Date;
}
