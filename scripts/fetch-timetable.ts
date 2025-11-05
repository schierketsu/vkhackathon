import * as fs from 'fs';
import * as path from 'path';
import { authenticate, parseGroupTimetable, getAllGroupsFromFile, Group } from '../src/utils/timetable-parser';
import { TimetableData } from '../src/utils/timetable';

/**
 * Основная функция для получения и сохранения расписания всех групп
 */
async function fetchAllTimetables() {
  console.log('🚀 Начинаем парсинг расписания с tt.chuvsu.ru...\n');
  
  // Авторизация
  console.log('🔐 Выполнение авторизации...');
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.error('❌ Не удалось авторизоваться. Проверьте логин и пароль.');
    process.exit(1);
  }
  
  // Получаем список всех групп из forparser.json
  console.log('\n📋 Получаем список всех групп из forparser.json...');
  const groups = getAllGroupsFromFile();
  
  if (groups.length === 0) {
    console.error('❌ Не найдено групп в forparser.json');
    process.exit(1);
  }
  
  console.log(`✅ Найдено ${groups.length} групп\n`);
  
  await processGroups(groups);
}

/**
 * Обрабатывает список групп и парсит расписание для каждой
 */
async function processGroups(groups: Group[]) {
  const timetableData: TimetableData = {
    faculties: {}
  };
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    console.log(`[${i + 1}/${groups.length}] Парсинг группы: ${group.value} (${group.name})...`);
    
    try {
      const schedule = await parseGroupTimetable(group.ссылка, group.value);
      
      if (schedule) {
        // Получаем информацию о факультете, форме обучения и степени
        const faculty = group.faculty || 'Неизвестный факультет';
        const studyFormat = group.studyFormat || 'очная';
        const degree = group.degree || 'Бакалавриат';
        
        // Инициализируем структуру, если она еще не существует
        if (!timetableData.faculties[faculty]) {
          timetableData.faculties[faculty] = {};
        }
        if (!timetableData.faculties[faculty][studyFormat]) {
          timetableData.faculties[faculty][studyFormat] = {};
        }
        if (!timetableData.faculties[faculty][studyFormat][degree]) {
          timetableData.faculties[faculty][studyFormat][degree] = {};
        }
        
        // Добавляем расписание группы
        timetableData.faculties[faculty][studyFormat][degree][group.value] = schedule;
        successCount++;
        console.log(`  ✅ Расписание для ${group.value} успешно получено\n`);
      } else {
        errorCount++;
        console.log(`  ❌ Ошибка при получении расписания для ${group.value}\n`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Исключение при парсинге ${group.value}:`, error);
      console.log('');
    }
    
    // Небольшая задержка между запросами, чтобы не перегружать сервер
    if (i < groups.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Сохраняем результат
  const outputPath = path.join(process.cwd(), 'data', 'timetable.json');
  fs.writeFileSync(outputPath, JSON.stringify(timetableData, null, 2), 'utf-8');
  
  console.log('\n📊 Результаты:');
  console.log(`  ✅ Успешно: ${successCount} групп`);
  console.log(`  ❌ Ошибок: ${errorCount} групп`);
  console.log(`\n💾 Расписание сохранено в: ${outputPath}`);
}

// Запуск скрипта
if (require.main === module) {
  fetchAllTimetables().catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}
