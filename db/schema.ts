import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const catalog = sqliteTable('catalog',{id:text('id').primaryKey(),data:text('data').notNull()});
export const inquiries = sqliteTable('inquiries',{id:text('id').primaryKey(),data:text('data').notNull(),status:text('status').notNull().default('คำขอใหม่'),createdAt:text('created_at').notNull()});
export const siteSettings = sqliteTable('site_settings',{key:text('key').primaryKey(),data:text('data').notNull()});
