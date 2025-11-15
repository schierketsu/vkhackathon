import { database } from './database';

export interface User {
  user_id: string;
  group_name: string | null;
  subgroup: number | null;
  institution_name: string | null;
  notifications_enabled: number;
  events_subscribed: number;
  created_at: string;
  user_state?: string | null;
  morning_alarm_enabled?: number;
}

export function getUser(userId: string): User | null {
  const stmt = database.prepare('SELECT * FROM users WHERE user_id = ?');
  return (stmt.get(userId) as User) || null;
}

export function createUser(userId: string, groupName?: string, subgroup?: number | null, institutionName?: string | null): User {
  const stmt = database.prepare(`
    INSERT INTO users (user_id, group_name, subgroup, institution_name, notifications_enabled, events_subscribed)
    VALUES (?, ?, ?, ?, 1, 1)
    ON CONFLICT(user_id) DO UPDATE SET group_name = ?, subgroup = ?, institution_name = ?
  `);
  
  stmt.run(userId, groupName || null, subgroup || null, institutionName || null, groupName || null, subgroup || null, institutionName || null);
  
  return getUser(userId)!;
}

export function updateUserGroup(userId: string, groupName: string, subgroup?: number | null, institutionName?: string | null): void {
  const stmt = database.prepare('UPDATE users SET group_name = ?, subgroup = ?, institution_name = ? WHERE user_id = ?');
  stmt.run(groupName, subgroup || null, institutionName || null, userId);
}

export function updateUserInstitution(userId: string, institutionName: string | null): void {
  const stmt = database.prepare('UPDATE users SET institution_name = ? WHERE user_id = ?');
  stmt.run(institutionName, userId);
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

export function setUserState(userId: string, state: string | null): void {
  const stmt = database.prepare('UPDATE users SET user_state = ? WHERE user_id = ?');
  stmt.run(state, userId);
}

export function toggleMorningAlarm(userId: string, enabled: boolean): void {
  const stmt = database.prepare('UPDATE users SET morning_alarm_enabled = ? WHERE user_id = ?');
  stmt.run(enabled ? 1 : 0, userId);
}

