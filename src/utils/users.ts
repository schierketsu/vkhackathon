import { database } from './database';

export interface User {
  user_id: string;
  group_name: string | null;
  subgroup: number | null;
  notifications_enabled: number;
  events_subscribed: number;
  created_at: string;
}

export function getUser(userId: string): User | null {
  const stmt = database.prepare('SELECT * FROM users WHERE user_id = ?');
  return (stmt.get(userId) as User) || null;
}

export function createUser(userId: string, groupName?: string, subgroup?: number | null): User {
  const stmt = database.prepare(`
    INSERT INTO users (user_id, group_name, subgroup, notifications_enabled, events_subscribed)
    VALUES (?, ?, ?, 1, 1)
    ON CONFLICT(user_id) DO UPDATE SET group_name = ?, subgroup = ?
  `);
  
  stmt.run(userId, groupName || null, subgroup || null, groupName || null, subgroup || null);
  
  return getUser(userId)!;
}

export function updateUserGroup(userId: string, groupName: string, subgroup?: number | null): void {
  const stmt = database.prepare('UPDATE users SET group_name = ?, subgroup = ? WHERE user_id = ?');
  stmt.run(groupName, subgroup || null, userId);
}

export function updateUserSubgroup(userId: string, subgroup: number | null): void {
  const stmt = database.prepare('UPDATE users SET subgroup = ? WHERE user_id = ?');
  stmt.run(subgroup, userId);
}

export function toggleNotifications(userId: string, enabled: boolean): void {
  const stmt = database.prepare('UPDATE users SET notifications_enabled = ? WHERE user_id = ?');
  stmt.run(enabled ? 1 : 0, userId);
}

export function toggleEventsSubscription(userId: string, subscribed: boolean): void {
  const stmt = database.prepare('UPDATE users SET events_subscribed = ? WHERE user_id = ?');
  stmt.run(subscribed ? 1 : 0, userId);
}

