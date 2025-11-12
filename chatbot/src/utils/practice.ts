import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { getDatabase } from './database';

export interface PracticeCompany {
  id: string;
  name: string;
  description?: string;
  location?: string;
  tags: string[];
  avatar?: string;
  rating?: number;
}

export interface PracticeApplication {
  id: number;
  user_id: string;
  company_id: string;
  company_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

function loadPracticeCompaniesData() {
  const possiblePaths = [
    path.join(__dirname, '../../../data/practice-companies.json'),
    path.join(process.cwd(), 'data/practice-companies.json'),
  ];

  for (const practiceCompaniesPath of possiblePaths) {
    if (fs.existsSync(practiceCompaniesPath)) {
      try {
        const content = fs.readFileSync(practiceCompaniesPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('Ошибка загрузки practice-companies.json из', practiceCompaniesPath, ':', error);
      }
    }
  }

  return null;
}

export function getPracticeInstitutionsStructure() {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return { institutions: [] };
  }

  const structure: any = {
    institutions: []
  };

  for (const institutionName in practiceCompaniesData) {
    const institution = practiceCompaniesData[institutionName];
    const institutionData: any = {
      name: institutionName,
      faculties: []
    };

    for (const facultyName in institution) {
      const faculty = institution[facultyName];
      if (Array.isArray(faculty)) {
        institutionData.faculties.push({
          name: facultyName
        });
      }
    }

    structure.institutions.push(institutionData);
  }

  return structure;
}

export function getPracticeCompanies(institutionName: string, facultyName: string): PracticeCompany[] {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  if (
    practiceCompaniesData[institutionName] &&
    practiceCompaniesData[institutionName][facultyName]
  ) {
    return practiceCompaniesData[institutionName][facultyName] as PracticeCompany[];
  }

  return [];
}

export function getPracticeTagsForFaculty(institutionName: string, facultyName: string): string[] {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  const tagsSet = new Set<string>();

  if (
    practiceCompaniesData[institutionName] &&
    practiceCompaniesData[institutionName][facultyName]
  ) {
    const companies = practiceCompaniesData[institutionName][facultyName];
    if (Array.isArray(companies)) {
      for (const company of companies) {
        if (company.tags && Array.isArray(company.tags)) {
          for (const tag of company.tags) {
            tagsSet.add(tag);
          }
        }
      }
    }
  }

  return Array.from(tagsSet).sort();
}

export function createPracticeApplication(userId: string, companyId: string, companyName: string): PracticeApplication {
  const database = getDatabase();
  if (!database) throw new Error('База данных не инициализирована');
  
  const stmt = database.prepare(`
    INSERT INTO practice_applications (user_id, company_id, company_name, status)
    VALUES (?, ?, ?, 'pending')
  `);
  const result = stmt.run(userId, companyId, companyName);
  
  return getPracticeApplication(result.lastInsertRowid as number)!;
}

export function getPracticeApplication(id: number): PracticeApplication | null {
  const database = getDatabase();
  if (!database) return null;
  const stmt = database.prepare('SELECT * FROM practice_applications WHERE id = ?');
  return (stmt.get(id) as PracticeApplication) || null;
}

export function getUserPracticeApplications(userId: string): PracticeApplication[] {
  const database = getDatabase();
  if (!database) return [];
  const stmt = database.prepare('SELECT * FROM practice_applications WHERE user_id = ? ORDER BY created_at DESC');
  return (stmt.all(userId) as PracticeApplication[]) || [];
}

export function hasUserAppliedToCompany(userId: string, companyId: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const stmt = database.prepare('SELECT COUNT(*) as count FROM practice_applications WHERE user_id = ? AND company_id = ?');
  const result = stmt.get(userId, companyId) as { count: number };
  return result.count > 0;
}

export function deletePracticeApplication(userId: string, applicationId: number): boolean {
  const database = getDatabase();
  if (!database) return false;
  const stmt = database.prepare('DELETE FROM practice_applications WHERE id = ? AND user_id = ?');
  const result = stmt.run(applicationId, userId);
  return result.changes > 0;
}

export function getCompanyRating(companyId: string): number {
  const database = getDatabase();
  if (!database) return 0;
  const stmt = database.prepare('SELECT AVG(rating) as avg_rating FROM company_reviews WHERE company_id = ?');
  const result = stmt.get(companyId) as { avg_rating: number | null };
  return result.avg_rating ? Math.round(result.avg_rating * 100) / 100 : 0;
}

