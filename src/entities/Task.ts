import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, default: 'todo' })
  status: 'todo' | 'in_progress' | 'done' | 'cancelled' = 'todo';

  @Column({ type: 'varchar', length: 50, nullable: true })
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'uuid', nullable: true })
  assignedLocationId?: string; // References locations.id

  @Column({ type: 'uuid', nullable: true })
  relatedZoneId?: string; // References zones.id

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ type: 'int', default: 0 })
  completionPercentage: number = 0;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
