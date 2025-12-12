import { bigint, varchar, text, datetime, date, time, float, int, mysqlTable, mysqlSchema, index } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const user = mysqlTable('user', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 255 }),
  password: varchar('password', { length: 255 }),
  roleId: bigint('role_id', { mode: 'number' }),
  clubId: bigint('club_id', { mode: 'number' }),
});

export const club = mysqlTable('club', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }),
});

export const member = mysqlTable('member', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  memberId: bigint('member_id', { mode: 'number' }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
});

export const listBooking = mysqlTable('list_booking', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  day: date('day'),
  starttime: time('starttime'),
  daystarttime: datetime('daystarttime'),
  endtime: time('endtime'),
  resourceName: varchar('resource_name', { length: 155 }),
  clubName: varchar('club_name', { length: 50 }),
  cancelfee: float('cancelfee'),
  cancelbenefitloss: float('cancelbenefitloss'),
  type: varchar('type', { length: 155 }),
  description: text('description'),
  parentid: bigint('parentid', { mode: 'number' }),
  room: bigint('room', { mode: 'number' }),
  equipment: text('equipment'),
  alreadyRepeating: bigint('already_repeating', { mode: 'number' }),
  length: varchar('length', { length: 50 }),
  livestreamurl: int('livestreamurl'),
  result: int('result'),
  isCancelled: int('is_cancelled'),
  memberId: bigint('member_id', { mode: 'number' }),
  showName: text('show_name'),
  myBooking: int('my_booking'),
  faceBookingMember: int('face_booking_member').default(0),
  faceBookingPt: int('face_booking_pt').default(0),
}, (table) => ({
  idIdx: index('idx_list_booking_id').on(table.id),
}));

export const frCheckinLog = mysqlTable('fr_checkin_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  memberId: bigint('member_id', { mode: 'number' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  doorid: bigint('doorid', { mode: 'number' }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  message: text('message'),
  deniedReason: varchar('denied_reason', { length: 255 }),
  createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  // face_booking_member dan face_booking_pt sudah dipindahkan ke list_booking
}, (table) => ({
  memberIdIdx: index('member_id').on(table.memberId),
  dooridIdx: index('doorid').on(table.doorid),
  dateIdx: index('date').on(table.date),
}));

// Note: log_webhook table is not in Prisma schema, but we need it
// We'll define it based on usage in the queries
export const logWebhook = mysqlTable('log_webhook', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  bookingid: bigint('bookingid', { mode: 'number' }),
  doorid: bigint('doorid', { mode: 'number' }),
  doorname: varchar('doorname', { length: 255 }),
  membername: varchar('membername', { length: 255 }),
  access: varchar('access', { length: 50 }),
  membershipname: varchar('membershipname', { length: 255 }),
  timestamp: datetime('timestamp'),
  booking_checkin: int('booking_checkin'),
});
