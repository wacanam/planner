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
import type { Group } from './Group';

export enum GroupRole {
  GROUP_OVERSEER = 'group_overseer',
  ASSISTANT_OVERSEER = 'assistant_overseer',
  MEMBER = 'member',
}

@Entity('group_members')
@Unique(['userId', 'groupId'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  groupId!: string;

  @Column({ type: 'varchar', length: 50, default: GroupRole.MEMBER })
  groupRole!: GroupRole;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne('Group', 'members', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: Group;

  @CreateDateColumn()
  joinedAt!: Date;
}
