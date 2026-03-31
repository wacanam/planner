import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './User';

@Entity('offline_sync_queue')
@Index('idx_sync_queue_user', ['user'])
@Index('idx_sync_queue_status', ['status'])
export class OfflineSyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column('uuid')
  userId!: string;

  @Column('varchar', { length: 50 })
  entityType!: string;

  @Column('uuid')
  entityId!: string;

  @Column('varchar', { length: 50 })
  operation!: string;

  @Column('jsonb')
  data!: Record<string, unknown>;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp!: Date;

  @Column('varchar', { length: 50, default: 'PENDING' })
  status!: string;

  @Column('timestamp', { nullable: true })
  syncedAt?: Date;

  @Column('text', { nullable: true })
  error?: string;

  @Column('int', { default: 0 })
  retryCount!: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
