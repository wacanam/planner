import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { Congregation } from './Congregation';
import type { GroupMember } from './GroupMember';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  congregationId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ManyToOne('Congregation', 'groups', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'congregationId' })
  congregation!: Congregation;

  @OneToMany('GroupMember', 'group')
  members!: GroupMember[];

  @CreateDateColumn()
  createdAt!: Date;
}
