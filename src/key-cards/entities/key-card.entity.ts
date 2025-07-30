import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export enum KeyCardStatus {
  UNUSED = 'unused',
  USED = 'used',
}

@Entity()
export class KeyCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: KeyCardStatus,
    default: KeyCardStatus.UNUSED,
  })
  status: KeyCardStatus;

  @Column({ nullable: true })
  firstUseTime: Date;

  @Column({ nullable: true })
  batchId: number;

  @Column({ nullable: true })
  meituan_token: string;

  @Column({
    type: 'varchar',
    length: 2000,
    name: 'coupon_info',
    nullable: true,
  })
  coupon_info: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP', // MySQL 5.5 不支持 (6)
    name: 'created_at',
  })
  createdAt: Date;
}
