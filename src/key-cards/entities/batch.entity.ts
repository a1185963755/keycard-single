import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { KeyCard } from './key-card.entity';

@Entity()
export class Batch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  count: number;

  @OneToMany(() => KeyCard, (keyCard) => keyCard.batchId)
  keyCards: KeyCard[];

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP', // MySQL 5.5 不支持 (6)
    name: 'created_at',
  })
  createdAt: Date;
}
