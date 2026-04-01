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
import type { User } from './User';
import type { CongregationMember } from './CongregationMember';
import type { Group } from './Group';

@Entity('congregations')
export class Congregation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive' = 'active';

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @OneToMany('User', 'congregation')
  users!: User[];

  @OneToMany('CongregationMember', 'congregation')
  members!: CongregationMember[];

  @OneToMany('Group', 'congregation')
  groups!: Group[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
