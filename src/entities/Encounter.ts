import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Visit } from './Visit';
import { Household } from './Household';
import { User } from './User';

@Entity('encounters')
@Index('idx_encounters_household', ['household'])
export class Encounter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Visit, { nullable: true })
  visit?: Visit;

  @Column('uuid', { nullable: true })
  visitId?: string;

  @ManyToOne(() => Household)
  household!: Household;

  @Column('uuid')
  householdId!: string;

  @ManyToOne(() => User)
  user!: User;

  @Column('uuid')
  userId!: string;

  @Column('varchar', { length: 50 })
  type!: string;

  @Column('text')
  description!: string;

  @Column('varchar', { length: 255, nullable: true })
  personSpoken?: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  date!: Date;

  @Column('int', { nullable: true })
  duration?: number;

  @Column('boolean', { default: false })
  followUp!: boolean;

  @Column('timestamp', { nullable: true })
  followUpDate?: Date;

  @Column('text', { nullable: true })
  followUpNotes?: string;

  @Column('timestamp', { nullable: true })
  syncedAt?: Date;

  @Column('boolean', { default: false })
  offlineCreated!: boolean;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
