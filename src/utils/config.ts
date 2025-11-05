import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  university: string;
  groups: string[];
  deadlines_enabled: boolean;
  events_source: string;
  timetable_source: string;
  semester_start?: string;
  notifications: {
    morning_time: string;
    evening_time: string;
    deadline_reminder_hours: number;
  };
}

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) {
    return config;
  }

  const configPath = path.join(process.cwd(), 'config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error('Файл config.json не найден!');
  }

  const configData = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configData) as Config;
  
  return config;
}

export function getConfig(): Config {
  return loadConfig();
}

