import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { User } from './User';
import type { Congregation } from './Congregation';

export enum CongregationRole {
  SERVICE_OVERSEER = 'service_overseer',
  TERRITORY_SERVANT = 'territory_servant',
}

@Entity('congregation_members')
@Unique(['userId', 'congregationId'])
export class CongregationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  congregationId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  congregationRole?: CongregationRole | null;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne('Congregation', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregationId' })
  congregation!: Congregation;

  @CreateDateColumn()
  joinedAt!: Date;
}
