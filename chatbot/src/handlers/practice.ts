import { Context, Keyboard } from '@maxhub/max-bot-api';
import {
  getPracticeInstitutionsStructure,
  getPracticeCompanies,
  getPracticeTagsForFaculty,
  createPracticeApplication,
  getUserPracticeApplications,
  hasUserAppliedToCompany,
  deletePracticeApplication,
  getCompanyRating,
  PracticeCompany
} from '../utils/practice';
import { getUser } from '../utils/users';
import { getMainMenu } from '../utils/menu';
import { formatFacultyName } from '../utils/formatters';

export function setupPracticeHandlers(bot: any) {
  // Главное меню практики
  bot.action('menu:practice', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);

    const institutions = getPracticeInstitutionsStructure();
    
    if (institutions.institutions.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Данные о практиках не найдены.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }

    const buttons = institutions.institutions.map((inst: { name: string; faculties: Array<{ name: string }> }) =>
      [Keyboard.button.callback(inst.name, `practice:institution:${encodeURIComponent(inst.name)}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Главное меню', 'menu:main')]);

    await ctx.answerOnCallback({
      message: {
        text: '💼 Практика\n\nВыберите учебное заведение:',
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Выбор учебного заведения
  bot.action(/practice:institution:(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    
    const institutions = getPracticeInstitutionsStructure();
    const institution = institutions.institutions.find((inst: { name: string; faculties: Array<{ name: string }> }) => inst.name === institutionName);
    
    if (!institution || institution.faculties.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Факультеты не найдены для выбранного учебного заведения.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }

    const buttons = institution.faculties.map((faculty: { name: string }) =>
      [Keyboard.button.callback(
        formatFacultyName(faculty.name),
        `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(faculty.name)}`
      )]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:practice')]);

    await ctx.answerOnCallback({
      message: {
        text: `💼 Практика\n\nУчебное заведение: ${institutionName}\n\nВыберите факультет:`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Выбор факультета - показываем компании с фильтром по стекам
  bot.action(/practice:faculty:(.+):(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    const facultyName = decodeURIComponent(ctx.match?.[2] || '');

    const companies = getPracticeCompanies(institutionName, facultyName);
    const tags = getPracticeTagsForFaculty(institutionName, facultyName);
    
    if (companies.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Компании не найдены для факультета ${formatFacultyName(facultyName)}.`,
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('◀️ Назад', `practice:institution:${encodeURIComponent(institutionName)}`)]
          ])]
        }
      });
      return;
    }

    let text = `💼 Практика\n\nУчебное заведение: ${institutionName}\nФакультет: ${formatFacultyName(facultyName)}\n\n`;
    
    // Показываем фильтры по стекам (тегам), если они есть
    const buttons: any[][] = [];
    
    if (tags.length > 0) {
      text += `🏷️ Фильтр по стекам:\n\n`;
      // Добавляем кнопки для фильтров (первые 8 тегов)
      const displayTags = tags.slice(0, 8);
      for (let i = 0; i < displayTags.length; i += 2) {
        const row = displayTags.slice(i, i + 2).map(tag =>
          Keyboard.button.callback(`🔹 ${tag}`, `practice:filter:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}:${encodeURIComponent(tag)}`)
        );
        buttons.push(row);
      }
      buttons.push([Keyboard.button.callback('📋 Показать все компании', `practice:faculty_all:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)]);
      buttons.push([Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]);
      buttons.push([Keyboard.button.callback('◀️ Назад', `practice:institution:${encodeURIComponent(institutionName)}`)]);
    } else {
      // Если нет тегов, показываем все компании
      const displayCompanies = companies.slice(0, 10);
      text += `Доступные компании:\n\n`;
      
      displayCompanies.forEach((company, index) => {
        const rating = getCompanyRating(company.id);
        text += `${index + 1}. ${company.name}`;
        if (rating > 0) {
          text += ` ⭐ ${rating.toFixed(1)}`;
        }
        text += '\n';
        
        if (index < 5) {
          buttons.push([
            Keyboard.button.callback(
              `${index + 1}. ${company.name.substring(0, 30)}${company.name.length > 30 ? '...' : ''}`,
              `practice:company:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}:${encodeURIComponent(company.id)}`
            )
          ]);
        }
      });

      if (companies.length > 10) {
        text += `\n... и еще ${companies.length - 10} компаний`;
      }

      buttons.push([Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]);
      buttons.push([Keyboard.button.callback('◀️ Назад', `practice:institution:${encodeURIComponent(institutionName)}`)]);
    }

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Показать все компании (без фильтра)
  bot.action(/practice:faculty_all:(.+):(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    const facultyName = decodeURIComponent(ctx.match?.[2] || '');

    const companies = getPracticeCompanies(institutionName, facultyName);
    
    if (companies.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Компании не найдены для факультета ${formatFacultyName(facultyName)}.`,
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('◀️ Назад', `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)]
          ])]
        }
      });
      return;
    }

    const displayCompanies = companies.slice(0, 10);
    let text = `💼 Практика\n\nУчебное заведение: ${institutionName}\nФакультет: ${formatFacultyName(facultyName)}\n\nВсе компании:\n\n`;
    
    const buttons: any[][] = [];
    
    displayCompanies.forEach((company, index) => {
      const rating = getCompanyRating(company.id);
      text += `${index + 1}. ${company.name}`;
      if (rating > 0) {
        text += ` ⭐ ${rating.toFixed(1)}`;
      }
      if (company.tags && company.tags.length > 0) {
        text += ` [${company.tags.join(', ')}]`;
      }
      text += '\n';
      
      if (index < 5) {
        buttons.push([
          Keyboard.button.callback(
            `${index + 1}. ${company.name.substring(0, 30)}${company.name.length > 30 ? '...' : ''}`,
            `practice:company:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}:${encodeURIComponent(company.id)}`
          )
        ]);
      }
    });

    if (companies.length > 10) {
      text += `\n... и еще ${companies.length - 10} компаний`;
    }

    buttons.push([Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]);
    buttons.push([Keyboard.button.callback('◀️ Назад', `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)]);

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Фильтр по тегу (стеку)
  bot.action(/practice:filter:(.+):(.+):(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    const facultyName = decodeURIComponent(ctx.match?.[2] || '');
    const tag = decodeURIComponent(ctx.match?.[3] || '');

    const allCompanies = getPracticeCompanies(institutionName, facultyName);
    const filteredCompanies = allCompanies.filter(company => 
      company.tags && company.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
    
    if (filteredCompanies.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Компании со стеком "${tag}" не найдены.`,
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('◀️ Назад', `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)]
          ])]
        }
      });
      return;
    }

    const displayCompanies = filteredCompanies.slice(0, 10);
    let text = `💼 Практика\n\nУчебное заведение: ${institutionName}\nФакультет: ${formatFacultyName(facultyName)}\n🏷️ Стек: ${tag}\n\nКомпании (${filteredCompanies.length}):\n\n`;
    
    const buttons: any[][] = [];
    
    displayCompanies.forEach((company, index) => {
      const rating = getCompanyRating(company.id);
      text += `${index + 1}. ${company.name}`;
      if (rating > 0) {
        text += ` ⭐ ${rating.toFixed(1)}`;
      }
      text += '\n';
      
      if (index < 5) {
        buttons.push([
          Keyboard.button.callback(
            `${index + 1}. ${company.name.substring(0, 30)}${company.name.length > 30 ? '...' : ''}`,
            `practice:company:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}:${encodeURIComponent(company.id)}`
          )
        ]);
      }
    });

    if (filteredCompanies.length > 10) {
      text += `\n... и еще ${filteredCompanies.length - 10} компаний`;
    }

    buttons.push([Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]);
    buttons.push([Keyboard.button.callback('◀️ Назад', `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)]);

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Детали компании
  bot.action(/practice:company:(.+):(.+):(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    const facultyName = decodeURIComponent(ctx.match?.[2] || '');
    const companyId = decodeURIComponent(ctx.match?.[3] || '');

    const companies = getPracticeCompanies(institutionName, facultyName);
    const company = companies.find(c => c.id === companyId);

    if (!company) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Компания не найдена.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }

    const rating = getCompanyRating(company.id);
    const hasApplied = hasUserAppliedToCompany(userId, companyId);

    let text = `💼 ${company.name}\n\n`;
    
    if (company.description) {
      text += `${company.description}\n\n`;
    }
    
    if (company.location) {
      text += `📍 ${company.location}\n`;
    }
    
    if (rating > 0) {
      text += `⭐ Рейтинг: ${rating.toFixed(1)}\n`;
    }
    
    if (company.tags && company.tags.length > 0) {
      text += `\n🏷️ Теги: ${company.tags.join(', ')}\n`;
    }

    const buttons: any[][] = [];
    
    if (!hasApplied) {
      buttons.push([
        Keyboard.button.callback(
          '✅ Подать заявку',
          `practice:apply:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}:${encodeURIComponent(companyId)}:${encodeURIComponent(company.name)}`
        )
      ]);
    } else {
      buttons.push([
        Keyboard.button.callback('✅ Заявка уже подана', 'practice:applications')
      ]);
    }
    
    buttons.push([
      Keyboard.button.callback('◀️ Назад', `practice:faculty:${encodeURIComponent(institutionName)}:${encodeURIComponent(facultyName)}`)
    ]);

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Подача заявки
  bot.action(/practice:apply:(.+):(.+):(.+):(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    const facultyName = decodeURIComponent(ctx.match?.[2] || '');
    const companyId = decodeURIComponent(ctx.match?.[3] || '');
    const companyName = decodeURIComponent(ctx.match?.[4] || '');

    if (hasUserAppliedToCompany(userId, companyId)) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Заявка на эту компанию уже подана.',
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои заявки', 'practice:applications')],
            [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
          ])]
        }
      });
      return;
    }

    try {
      createPracticeApplication(userId, companyId, companyName);
      
      await ctx.answerOnCallback({
        message: {
          text: `✅ Заявка на практику в компанию "${companyName}" успешно подана!\n\nСтатус: Ожидает рассмотрения`,
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои заявки', 'practice:applications')],
            [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
          ])]
        }
      });
    } catch (error: any) {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Ошибка при подаче заявки: ${error.message}`,
          attachments: [getMainMenu()]
        }
      });
    }
  });

  // Мои заявки
  bot.action('practice:applications', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();

    const applications = getUserPracticeApplications(userId);

    if (applications.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '📋 У вас пока нет заявок на практику.\n\nВыберите компанию из списка, чтобы подать заявку.',
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('💼 Практика', 'menu:practice')],
            [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
          ])]
        }
      });
      return;
    }

    let text = '📋 Мои заявки на практику:\n\n';
    
    const buttons: any[][] = [];
    
    applications.forEach((app, index) => {
      const statusEmoji = app.status === 'accepted' ? '✅' : app.status === 'rejected' ? '❌' : '⏳';
      const statusText = app.status === 'accepted' ? 'Принята' : app.status === 'rejected' ? 'Отклонена' : 'Ожидает';
      
      text += `${index + 1}. ${app.company_name}\n`;
      text += `   ${statusEmoji} ${statusText}\n\n`;
      
      if (index < 5) {
        buttons.push([
          Keyboard.button.callback(
            `${index + 1}. ${app.company_name.substring(0, 30)}${app.company_name.length > 30 ? '...' : ''} - ${statusText}`,
            `practice:application:${app.id}`
          )
        ]);
      }
    });

    buttons.push([Keyboard.button.callback('◀️ Главное меню', 'menu:main')]);

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Детали заявки
  bot.action(/practice:application:(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const applicationId = parseInt(ctx.match?.[1] || '0');

    const applications = getUserPracticeApplications(userId);
    const application = applications.find(app => app.id === applicationId);

    if (!application) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Заявка не найдена.',
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]
          ])]
        }
      });
      return;
    }

    const statusEmoji = application.status === 'accepted' ? '✅' : application.status === 'rejected' ? '❌' : '⏳';
    const statusText = application.status === 'accepted' ? 'Принята' : application.status === 'rejected' ? 'Отклонена' : 'Ожидает рассмотрения';
    
    let text = `📋 Заявка на практику\n\n`;
    text += `Компания: ${application.company_name}\n`;
    text += `Статус: ${statusEmoji} ${statusText}\n`;
    text += `Дата подачи: ${new Date(application.created_at).toLocaleDateString('ru-RU')}\n`;

    const buttons: any[][] = [];
    
    if (application.status === 'pending') {
      buttons.push([
        Keyboard.button.callback(
          '🗑️ Отозвать заявку',
          `practice:delete:${application.id}`
        )
      ]);
    }
    
    buttons.push([Keyboard.button.callback('◀️ Назад', 'practice:applications')]);

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Удаление заявки
  bot.action(/practice:delete:(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const applicationId = parseInt(ctx.match?.[1] || '0');

    const success = deletePracticeApplication(userId, applicationId);

    if (success) {
      await ctx.answerOnCallback({
        message: {
          text: '✅ Заявка успешно отозвана.',
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои заявки', 'practice:applications')],
            [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
          ])]
        }
      });
    } else {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Не удалось отозвать заявку. Возможно, она уже обработана.',
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Мои заявки', 'practice:applications')]
          ])]
        }
      });
    }
  });
}

