/**
 * Max Bridge - мост между ботом и мини-приложением
 * Позволяет синхронизировать данные между ботом и мини-приложением
 */

import { database } from './database';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export interface BridgeConfig {
  miniappApiUrl: string;
  port?: number;
  enabled?: boolean;
}

let bridgeConfig: BridgeConfig | null = null;

export function initBridge(config: BridgeConfig) {
  bridgeConfig = config;
  
  if (!config.enabled) {
    console.log('⚠️ Max Bridge отключен');
    return;
  }
  
  console.log(`🌉 Max Bridge инициализирован`);
  console.log(`   Мини-приложение API: ${config.miniappApiUrl}`);
  
  // Здесь можно добавить HTTP сервер для приема запросов от мини-приложения
  // или периодическую синхронизацию данных
}

/**
 * Отправить данные из бота в мини-приложение
 */
export async function sendToMiniapp(endpoint: string, data: any): Promise<any> {
  if (!bridgeConfig || !bridgeConfig.enabled) {
    return null;
  }
  
  try {
    const apiUrl = bridgeConfig.miniappApiUrl.replace(/\/$/, '');
    const fullUrl = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const parsedUrl = url.parse(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Source': 'bot-bridge'
      }
    };
    
    return new Promise((resolve, reject) => {
      const req = httpModule.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            resolve(json);
          } catch (e) {
            resolve(responseData);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Ошибка отправки данных в мини-приложение:', error);
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('Ошибка при отправке данных в мини-приложение:', error);
    return null;
  }
}

/**
 * Синхронизировать дедлайны с мини-приложением
 */
export async function syncDeadlinesToMiniapp(userId: string) {
  if (!bridgeConfig || !bridgeConfig.enabled) return;
  
  try {
    const stmt = database.prepare('SELECT * FROM deadlines WHERE user_id = ? AND DATE(due_date) >= DATE("now")');
    const deadlines = stmt.all(userId) as any[];
    
    await sendToMiniapp('/api/bridge/deadlines', {
      userId,
      deadlines: deadlines.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        due_date: d.due_date,
        created_at: d.created_at
      }))
    });
  } catch (error) {
    console.error('Ошибка синхронизации дедлайнов:', error);
  }
}

/**
 * Синхронизировать настройки пользователя с мини-приложением
 */
export async function syncUserSettingsToMiniapp(userId: string) {
  if (!bridgeConfig || !bridgeConfig.enabled) return;
  
  try {
    const stmt = database.prepare('SELECT * FROM users WHERE user_id = ?');
    const user = stmt.get(userId) as any;
    
    if (!user) return;
    
    await sendToMiniapp('/api/bridge/user-settings', {
      userId,
      settings: {
        group_name: user.group_name,
        subgroup: user.subgroup,
        institution_name: user.institution_name,
        notifications_enabled: user.notifications_enabled === 1,
        events_subscribed: user.events_subscribed === 1,
        morning_alarm_enabled: user.morning_alarm_enabled !== 0
      }
    });
  } catch (error) {
    console.error('Ошибка синхронизации настроек:', error);
  }
}

/**
 * Получить данные из мини-приложения
 */
export async function getFromMiniapp(endpoint: string): Promise<any> {
  if (!bridgeConfig || !bridgeConfig.enabled) {
    return null;
  }
  
  try {
    const apiUrl = bridgeConfig.miniappApiUrl.replace(/\/$/, '');
    const fullUrl = `${apiUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const parsedUrl = url.parse(fullUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    return new Promise((resolve, reject) => {
      const req = httpModule.get(fullUrl, {
        headers: {
          'X-Source': 'bot-bridge'
        }
      }, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            resolve(json);
          } catch (e) {
            resolve(responseData);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Ошибка получения данных из мини-приложения:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Ошибка при получении данных из мини-приложения:', error);
    return null;
  }
}

