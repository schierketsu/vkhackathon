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
  bridge?: {
    enabled?: boolean;
    miniapp_api_url?: string;
  };
}

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) {
    return config;
  }

  const configPath = path.join(__dirname, '../../../config.json');
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Файл config.json не найден по пути: ${configPath}`);
  }

  const configData = fs.readFileSync(configPath, 'utf-8');
  config = JSON.parse(configData) as Config;
  
  return config;
}

export function getConfig(): Config {
  return loadConfig();
}

