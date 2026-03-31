import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Congregation } from './Congregation';
import { Territory } from './Territory';
import { User } from './User';
import { Visit } from './Visit';
import { Encounter } from './Encounter';

@Entity('households')
@Index('idx_households_territory', ['territory'])
@Index('idx_households_location', ['location'], { spatial: true })
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Congregation)
  congregation!: Congregation;

  @Column('uuid')
  congregationId!: string;

  @ManyToOne(() => Territory)
  territory!: Territory;

  @Column('uuid')
  territoryId!: string;

  @Column('varchar', { length: 255 })
  address!: string;

  @Column('varchar', { length: 50, nullable: true })
  houseNumber?: string;

  @Column('varchar', { length: 255 })
  streetName!: string;

  @Column('varchar', { length: 255 })
  city!: string;

  @Column('varchar', { length: 20, nullable: true })
  postalCode?: string;

  @Column('geometry', { spatialFeatureType: 'Point', srid: 4326 })
  location!: string;

  @Column('text', { array: true, nullable: true })
  occupantsNames?: string[];

  @Column('int', { nullable: true })
  occupantsCount?: number;

  @Column('varchar', { length: 100, nullable: true })
  ageRange?: string;

  @Column('text', { nullable: true })
  specialNeeds?: string;

  @Column('varchar', { length: 50, default: 'NEW' })
  status!: string;

  @Column('timestamp', { nullable: true })
  lastVisitDate?: Date;

  @Column('text', { nullable: true })
  lastVisitNotes?: string;

  @Column('text', { array: true, nullable: true })
  preferredLiterature?: string[];

  @Column('varchar', { length: 50, nullable: true })
  languagePreference?: string;

  @Column('boolean', { default: false })
  doNotDisturb!: boolean;

  @Column('varchar', { length: 100, nullable: true })
  bestTimeToCall?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('text', { nullable: true })
  lwpNotes?: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: true })
  createdBy?: User;

  @Column('uuid', { nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  updatedBy?: User;

  @Column('uuid', { nullable: true })
  updatedByUserId?: string;

  @OneToMany(() => Visit, (visit) => visit.household)
  visits?: Visit[];

  @OneToMany(() => Encounter, (encounter) => encounter.household)
  encounters?: Encounter[];
}
