import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Household } from './Household';
import { TerritoryAssignment } from './TerritoryAssignment';
import { User } from './User';
import { Encounter } from './Encounter';

@Entity('visits')
@Index('idx_visits_household', ['household'])
@Index('idx_visits_assignment', ['assignment'])
@Index('idx_visits_visit_date', ['visitDate'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Household)
  household!: Household;

  @Column('uuid')
  householdId!: string;

  @ManyToOne(() => TerritoryAssignment)
  assignment!: TerritoryAssignment;

  @Column('uuid')
  assignmentId!: string;

  @Column('varchar', { length: 50, nullable: true })
  householdStatusBefore?: string;

  @Column('varchar', { length: 50, nullable: true })
  householdStatusAfter?: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  visitDate!: Date;

  @Column('int', { nullable: true })
  duration?: number;

  @Column('uuid', { array: true })
  visitedByIds!: string[];

  @Column('varchar', { length: 50, nullable: true })
  outcome?: string;

  @Column('text', { array: true, nullable: true })
  literatureGiven?: string[];

  @Column('boolean', { default: false })
  returnVisitPlanned!: boolean;

  @Column('timestamp', { nullable: true })
  nextVisitDate?: Date;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('timestamp', { nullable: true })
  syncedAt?: Date;

  @Column('varchar', { length: 50, default: 'PENDING' })
  syncStatus!: string;

  @Column('boolean', { default: false })
  offlineCreated!: boolean;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @OneToMany(() => Encounter, (encounter) => encounter.visit)
  encounters?: Encounter[];
}
