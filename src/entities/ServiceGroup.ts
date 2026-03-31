import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Congregation } from './Congregation';
import type { TerritoryAssignment } from './TerritoryAssignment';

@Entity('service_groups')
export class ServiceGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  congregationId!: string;

  @ManyToOne('Congregation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregationId' })
  congregation!: Congregation;

  @OneToMany('TerritoryAssignment', 'serviceGroup')
  assignments!: TerritoryAssignment[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
