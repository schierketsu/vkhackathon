// Конфигурация API
const API_URL = `${window.location.origin}/api`;

// Состояние приложения
let currentScreen = 'main';
let currentUser = null;
let currentPeriod = 'today';
let WebApp = null;

// Инициализация приложения с использованием MAX Bridge
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем MAX Bridge
        WebApp = window.MAXBridge.init();
        
        // Применяем тему MAX
        applyMAXTheme();
        
        // Получаем данные пользователя из MAX Bridge
        const userData = window.MAXBridge.getUser();
        const startParam = window.MAXBridge.getStartParam();
        
        let userId = null;
        let userName = null;
        
        // Пробуем получить из MAX Bridge
        if (userData && userData.id) {
            userId = userData.id.toString();
            userName = userData.first_name || 'Пользователь';
        }
        
        // Если не получили из Bridge, пробуем URL параметры
        if (!userId) {
            const urlParams = new URLSearchParams(window.location.search);
            const startapp = urlParams.get('startapp');
            
            if (startapp) {
                try {
                    const payload = new URLSearchParams(decodeURIComponent(startapp));
                    userId = payload.get('user_id');
                    userName = payload.get('user_name');
                } catch (e) {
                    console.error('Ошибка декодирования startapp:', e);
                }
            }
            
            if (!userId) {
                userId = urlParams.get('user_id') || localStorage.getItem('user_id');
                userName = urlParams.get('user_name') || localStorage.getItem('user_name');
            }
        }
        
        // Дефолтные значения
        if (!userId) {
            userId = '1';
            console.warn('ID пользователя не найден, используется дефолтное значение');
        }
        if (!userName) {
            userName = 'Пользователь';
        }
        
        // Сохраняем данные
        localStorage.setItem('user_id', userId);
        localStorage.setItem('user_name', userName);
        
        console.log('Инициализация приложения:', { userId, userName, startParam });
        console.log('MAX Bridge WebApp:', WebApp);

        // Загружаем данные пользователя
        await loadUserData(userId);
        
        // Настраиваем обработчики событий
        setupEventHandlers();
        
        // Показываем главный экран
        showScreen('main');
        hideLoading();
        
        // Настраиваем кнопку "Назад" MAX (если доступна)
        if (WebApp && WebApp.BackButton) {
            WebApp.BackButton.onClick(() => {
                if (currentScreen !== 'main') {
                    showScreen('main');
                }
            });
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Не удалось загрузить приложение: ' + (error.message || 'Неизвестная ошибка'));
    }
});

// Применение темы MAX
function applyMAXTheme() {
    if (!WebApp || !WebApp.themeParams) return;
    
    const theme = WebApp.themeParams;
    const root = document.documentElement;
    
    // Применяем цвета темы MAX
    if (theme.bg_color) {
        root.style.setProperty('--max-bg-color', theme.bg_color);
        document.body.style.backgroundColor = theme.bg_color;
    }
    if (theme.text_color) {
        root.style.setProperty('--max-text-color', theme.text_color);
    }
    if (theme.hint_color) {
        root.style.setProperty('--max-hint-color', theme.hint_color);
    }
    if (theme.link_color) {
        root.style.setProperty('--max-link-color', theme.link_color);
    }
    if (theme.button_color) {
        root.style.setProperty('--max-button-color', theme.button_color);
    }
    if (theme.button_text_color) {
        root.style.setProperty('--max-button-text-color', theme.button_text_color);
    }
    
    // Применяем цвет схемы
    if (WebApp.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}

// Обработка сообщений от родительского окна MAX
function handleParentMessage(event) {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'close':
                if (WebApp && WebApp.close) {
                    WebApp.close();
                } else {
                    window.close();
                }
                break;
            case 'user_data':
                if (event.data.user_id) {
                    localStorage.setItem('user_id', event.data.user_id);
                    loadUserData(event.data.user_id);
                }
                break;
        }
    }
}

window.addEventListener('message', handleParentMessage);

// Загрузка данных пользователя
async function loadUserData(userId) {
    try {
        console.log('Загрузка данных пользователя:', userId);
        const response = await fetch(`${API_URL}/user/${userId}`);
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('Данные пользователя загружены:', currentUser);
            updateUserInfo();
        } else {
            console.warn('Пользователь не найден, создаем нового');
            currentUser = {
                user_id: userId,
                group_name: null,
                subgroup: null,
                notifications_enabled: 1,
                events_subscribed: 1
            };
            updateUserInfo();
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        console.error('API URL:', API_URL);
        currentUser = {
            user_id: userId || localStorage.getItem('user_id') || '1',
            group_name: null,
            subgroup: null,
            notifications_enabled: 1,
            events_subscribed: 1
        };
        updateUserInfo();
        
        const groupInfo = document.getElementById('group-info');
        if (groupInfo) {
            groupInfo.textContent = '⚠️ Ошибка подключения к серверу';
            groupInfo.style.color = '#ff6b6b';
        }
    }
}

// Обновление информации о пользователе
function updateUserInfo() {
    const groupInfo = document.getElementById('group-info');
    if (currentUser && currentUser.group_name) {
        let text = `Группа: ${currentUser.group_name}`;
        if (currentUser.subgroup !== null && currentUser.subgroup !== undefined) {
            text += ` (подгруппа ${currentUser.subgroup})`;
        }
        groupInfo.textContent = text;
        groupInfo.style.color = '';
    } else {
        groupInfo.textContent = 'Группа не выбрана';
        groupInfo.style.color = '';
    }

    const notificationsToggle = document.getElementById('notifications-toggle');
    const eventsToggle = document.getElementById('events-subscribe-toggle');
    if (notificationsToggle) {
        notificationsToggle.checked = currentUser?.notifications_enabled === 1;
    }
    if (eventsToggle) {
        eventsToggle.checked = currentUser?.events_subscribed === 1;
    }
}

// Настройка обработчиков событий
function setupEventHandlers() {
    // Плитки главного экрана
    document.querySelectorAll('.tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const section = tile.dataset.section;
            if (section === 'schedule' && (!currentUser || !currentUser.group_name)) {
                showScreen('settings');
                if (WebApp && WebApp.showAlert) {
                    WebApp.showAlert('Сначала выберите группу в настройках');
                } else {
                    alert('Сначала выберите группу в настройках');
                }
                return;
            }
            showScreen(section);
        });
    });

    // Кнопка настроек
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        showScreen('settings');
    });

    // Кнопки назад
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const backScreen = btn.dataset.back || 'main';
            showScreen(backScreen);
        });
    });

    // Кнопки периода расписания
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadSchedule();
        });
    });

    // Поиск преподавателей
    const teacherSearch = document.getElementById('teacher-search');
    if (teacherSearch) {
        teacherSearch.addEventListener('input', debounce(handleTeacherSearch, 300));
    }

    // Добавление дедлайна
    document.getElementById('add-deadline-btn')?.addEventListener('click', () => {
        showModal('add-deadline-modal');
    });

    document.getElementById('save-deadline-btn')?.addEventListener('click', async () => {
        await saveDeadline();
    });

    document.getElementById('cancel-deadline-btn')?.addEventListener('click', () => {
        hideModal('add-deadline-modal');
        clearDeadlineForm();
    });

    // Выбор группы
    document.getElementById('select-group-btn')?.addEventListener('click', async () => {
        await showGroupSelection();
    });

    document.getElementById('select-subgroup-btn')?.addEventListener('click', async () => {
        if (!currentUser || !currentUser.group_name) {
            if (WebApp && WebApp.showAlert) {
                WebApp.showAlert('Сначала выберите группу');
            } else {
                alert('Сначала выберите группу');
            }
            return;
        }
        await showSubgroupSelection();
    });

    // Переключатели настроек
    document.getElementById('notifications-toggle')?.addEventListener('change', async (e) => {
        await updateSetting('notifications_enabled', e.target.checked ? 1 : 0);
    });

    document.getElementById('events-subscribe-toggle')?.addEventListener('change', async (e) => {
        await updateSetting('events_subscribed', e.target.checked ? 1 : 0);
    });
}

// Показать экран
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const screenElement = document.getElementById(`${screenName}-screen`);
    if (screenElement) {
        screenElement.classList.remove('hidden');
        currentScreen = screenName;
        
        // Показываем/скрываем кнопку "Назад" MAX
        if (WebApp && WebApp.BackButton) {
            if (screenName === 'main') {
                WebApp.BackButton.hide();
            } else {
                WebApp.BackButton.show();
            }
        }
        
        // Загружаем данные для экрана
        switch(screenName) {
            case 'schedule':
                loadSchedule();
                break;
            case 'teachers':
                loadTeachers();
                break;
            case 'events':
                loadEvents();
                break;
            case 'deadlines':
                loadDeadlines();
                break;
        }
    }
}

// Скрыть загрузку
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Показать ошибку
function showError(message) {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <div style="font-size: 18px; margin-bottom: 10px;">Ошибка загрузки приложения</div>
                <div style="font-size: 14px; color: #666;">${message}</div>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2481cc; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Перезагрузить
                </button>
            </div>
        `;
    } else {
        alert(message);
    }
}

// Загрузка расписания
async function loadSchedule() {
    const content = document.getElementById('schedule-content');
    if (!content) return;

    if (!currentUser || !currentUser.group_name) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Группа не выбрана</div></div>';
        return;
    }

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const period = currentPeriod || 'today';
        const response = await fetch(`${API_URL}/schedule/${currentUser.user_id}?period=${period}`);
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить расписание');
        }

        const schedule = await response.json();
        renderSchedule(schedule);
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Не удалось загрузить расписание</div></div>';
    }
}

// Отображение расписания
function renderSchedule(schedule) {
    const content = document.getElementById('schedule-content');
    if (!content) return;

    if (!schedule || schedule.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Расписание не найдено</div></div>';
        return;
    }

    let html = '';
    schedule.forEach(day => {
        if (day.lessons && day.lessons.length > 0) {
            html += `<div class="day-schedule">`;
            html += `<div class="day-header">${day.dayOfWeek || day.date}</div>`;
            
            day.lessons.forEach(lesson => {
                html += `<div class="lesson">`;
                html += `<div class="lesson-time">${lesson.time}</div>`;
                html += `<div class="lesson-subject">${lesson.subject}</div>`;
                html += `<div class="lesson-details">`;
                if (lesson.room) {
                    html += `<span>📍 ${lesson.room}</span>`;
                }
                if (lesson.teacher) {
                    html += `<span>👨‍🏫 ${lesson.teacher}</span>`;
                }
                if (lesson.lessonType) {
                    html += `<span>📚 ${lesson.lessonType}</span>`;
                }
                html += `</div>`;
                html += `</div>`;
            });
            
            html += `</div>`;
        }
    });

    content.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">Расписание не найдено</div></div>';
}

// Загрузка преподавателей
async function loadTeachers() {
    const content = document.getElementById('teachers-content');
    if (!content) return;

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/teachers`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить преподавателей');
        }

        const teachers = await response.json();
        renderTeachers(teachers);
    } catch (error) {
        console.error('Ошибка загрузки преподавателей:', error);
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Не удалось загрузить преподавателей</div></div>';
    }
}

// Отображение преподавателей
function renderTeachers(teachers) {
    const content = document.getElementById('teachers-content');
    if (!content) return;

    if (!teachers || teachers.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👨‍🏫</div><div class="empty-state-text">Преподаватели не найдены</div></div>';
        return;
    }

    let html = '';
    teachers.forEach(teacher => {
        html += `<div class="teacher-item" data-teacher="${encodeURIComponent(teacher)}">`;
        html += `<div class="teacher-name">${teacher}</div>`;
        html += `</div>`;
    });

    content.innerHTML = html;

    // Добавляем обработчики клика
    document.querySelectorAll('.teacher-item').forEach(item => {
        item.addEventListener('click', () => {
            const teacherName = decodeURIComponent(item.dataset.teacher);
            if (WebApp && WebApp.showAlert) {
                WebApp.showAlert(`Расписание преподавателя ${teacherName}`);
            } else {
                alert(`Расписание преподавателя ${teacherName}`);
            }
        });
    });
}

// Поиск преподавателей
async function handleTeacherSearch(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        loadTeachers();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/teachers/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Ошибка поиска');
        }

        const teachers = await response.json();
        renderTeachers(teachers);
    } catch (error) {
        console.error('Ошибка поиска:', error);
    }
}

// Загрузка мероприятий
async function loadEvents() {
    const content = document.getElementById('events-content');
    if (!content) return;

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить мероприятия');
        }

        const events = await response.json();
        renderEvents(events);
    } catch (error) {
        console.error('Ошибка загрузки мероприятий:', error);
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Не удалось загрузить мероприятия</div></div>';
    }
}

// Отображение мероприятий
function renderEvents(events) {
    const content = document.getElementById('events-content');
    if (!content) return;

    if (!events || events.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">Мероприятий не запланировано</div></div>';
        return;
    }

    let html = '';
    events.forEach(event => {
        html += `<div class="event-item">`;
        html += `<div class="event-date">${formatDate(event.date)}</div>`;
        html += `<div class="event-title">${event.title}</div>`;
        if (event.location) {
            html += `<div class="event-location">📍 ${event.location}</div>`;
        }
        if (event.description) {
            html += `<div class="event-description">${event.description}</div>`;
        }
        html += `</div>`;
    });

    content.innerHTML = html;
}

// Загрузка дедлайнов
async function loadDeadlines() {
    const content = document.getElementById('deadlines-content');
    if (!content) return;

    if (!currentUser) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏰</div><div class="empty-state-text">Войдите в систему</div></div>';
        return;
    }

    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_URL}/deadlines/${currentUser.user_id}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить дедлайны');
        }

        const deadlines = await response.json();
        renderDeadlines(deadlines);
    } catch (error) {
        console.error('Ошибка загрузки дедлайнов:', error);
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">Не удалось загрузить дедлайны</div></div>';
    }
}

// Отображение дедлайнов
function renderDeadlines(deadlines) {
    const content = document.getElementById('deadlines-content');
    if (!content) return;

    if (!deadlines || deadlines.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏰</div><div class="empty-state-text">Активных дедлайнов нет</div></div>';
        return;
    }

    let html = '';
    deadlines.forEach(deadline => {
        const daysLeft = getDaysLeft(deadline.due_date);
        const isUrgent = daysLeft <= 1;
        
        html += `<div class="deadline-item ${isUrgent ? 'urgent' : ''}">`;
        html += `<button class="delete-deadline" data-id="${deadline.id}">×</button>`;
        html += `<div class="deadline-title">${deadline.title}</div>`;
        if (deadline.description) {
            html += `<div class="deadline-description">${deadline.description}</div>`;
        }
        html += `<div class="deadline-date">📅 ${formatDate(deadline.due_date)}</div>`;
        html += `<div class="deadline-days-left">${getDaysLeftText(daysLeft)}</div>`;
        html += `</div>`;
    });

    content.innerHTML = html;

    // Добавляем обработчики удаления
    document.querySelectorAll('.delete-deadline').forEach(btn => {
        btn.addEventListener('click', async () => {
            const confirmed = WebApp && WebApp.showConfirm 
                ? await new Promise(resolve => {
                    WebApp.showConfirm('Удалить дедлайн?', resolve);
                })
                : confirm('Удалить дедлайн?');
            
            if (confirmed) {
                await deleteDeadline(btn.dataset.id);
            }
        });
    });
}

// Сохранение дедлайна
async function saveDeadline() {
    const title = document.getElementById('deadline-title').value.trim();
    const description = document.getElementById('deadline-description').value.trim();
    const date = document.getElementById('deadline-date').value;

    if (!title || !date) {
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Заполните все обязательные поля');
        } else {
            alert('Заполните все обязательные поля');
        }
        return;
    }

    if (!currentUser) {
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Войдите в систему');
        } else {
            alert('Войдите в систему');
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/deadlines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                title,
                description: description || null,
                due_date: date
            })
        });

        if (!response.ok) {
            throw new Error('Не удалось сохранить дедлайн');
        }

        hideModal('add-deadline-modal');
        clearDeadlineForm();
        loadDeadlines();
        
        // Отправляем данные обратно в бот через MAX Bridge
        if (WebApp && WebApp.sendData) {
            WebApp.sendData(JSON.stringify({ action: 'deadline_added', title }));
        }
    } catch (error) {
        console.error('Ошибка сохранения дедлайна:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось сохранить дедлайн');
        } else {
            alert('Не удалось сохранить дедлайн');
        }
    }
}

// Удаление дедлайна
async function deleteDeadline(id) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/deadlines/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.user_id
            })
        });

        if (!response.ok) {
            throw new Error('Не удалось удалить дедлайн');
        }

        loadDeadlines();
        
        // Отправляем данные обратно в бот
        if (WebApp && WebApp.sendData) {
            WebApp.sendData(JSON.stringify({ action: 'deadline_deleted', id }));
        }
    } catch (error) {
        console.error('Ошибка удаления дедлайна:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось удалить дедлайн');
        } else {
            alert('Не удалось удалить дедлайн');
        }
    }
}

// Очистка формы дедлайна
function clearDeadlineForm() {
    document.getElementById('deadline-title').value = '';
    document.getElementById('deadline-description').value = '';
    document.getElementById('deadline-date').value = '';
}

// Показать модальное окно
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Скрыть модальное окно
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Показать выбор группы
async function showGroupSelection() {
    try {
        const response = await fetch(`${API_URL}/groups`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить группы');
        }

        const groups = await response.json();
        const content = document.getElementById('group-selection-content');
        
        let html = '<div class="group-selection">';
        groups.forEach(group => {
            const isSelected = currentUser?.group_name === group;
            html += `<div class="group-option ${isSelected ? 'selected' : ''}" data-group="${group}">${group}</div>`;
        });
        html += '</div>';

        content.innerHTML = html;

        // Добавляем обработчики выбора
        document.querySelectorAll('.group-option').forEach(option => {
            option.addEventListener('click', async () => {
                const groupName = option.dataset.group;
                await updateGroup(groupName);
                hideModal('group-modal');
            });
        });

        showModal('group-modal');
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось загрузить группы');
        } else {
            alert('Не удалось загрузить группы');
        }
    }
}

// Показать выбор подгруппы
async function showSubgroupSelection() {
    if (!currentUser || !currentUser.group_name) return;

    try {
        const response = await fetch(`${API_URL}/subgroups/${encodeURIComponent(currentUser.group_name)}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить подгруппы');
        }

        const subgroups = await response.json();
        const content = document.getElementById('group-selection-content');
        
        let html = '<div class="group-selection">';
        html += `<div class="group-option ${currentUser.subgroup === null ? 'selected' : ''}" data-subgroup="null">Общая (без подгруппы)</div>`;
        subgroups.forEach(subgroup => {
            const isSelected = currentUser?.subgroup === subgroup;
            html += `<div class="group-option ${isSelected ? 'selected' : ''}" data-subgroup="${subgroup}">Подгруппа ${subgroup}</div>`;
        });
        html += '</div>';

        content.innerHTML = html;

        // Добавляем обработчики выбора
        document.querySelectorAll('.group-option').forEach(option => {
            option.addEventListener('click', async () => {
                const subgroup = option.dataset.subgroup === 'null' ? null : parseInt(option.dataset.subgroup);
                await updateSubgroup(subgroup);
                hideModal('group-modal');
            });
        });

        showModal('group-modal');
    } catch (error) {
        console.error('Ошибка загрузки подгрупп:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось загрузить подгруппы');
        } else {
            alert('Не удалось загрузить подгруппы');
        }
    }
}

// Обновление группы
async function updateGroup(groupName) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/group`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ group_name: groupName })
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить группу');
        }

        currentUser.group_name = groupName;
        updateUserInfo();
        
        // Отправляем данные обратно в бот
        if (WebApp && WebApp.sendData) {
            WebApp.sendData(JSON.stringify({ action: 'group_updated', group_name: groupName }));
        }
    } catch (error) {
        console.error('Ошибка обновления группы:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось обновить группу');
        } else {
            alert('Не удалось обновить группу');
        }
    }
}

// Обновление подгруппы
async function updateSubgroup(subgroup) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/subgroup`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subgroup })
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить подгруппу');
        }

        currentUser.subgroup = subgroup;
        updateUserInfo();
    } catch (error) {
        console.error('Ошибка обновления подгруппы:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось обновить подгруппу');
        } else {
            alert('Не удалось обновить подгруппу');
        }
    }
}

// Обновление настройки
async function updateSetting(setting, value) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/user/${currentUser.user_id}/setting`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ setting, value })
        });

        if (!response.ok) {
            throw new Error('Не удалось обновить настройку');
        }

        currentUser[setting] = value;
        
        // Отправляем данные обратно в бот
        if (WebApp && WebApp.sendData) {
            WebApp.sendData(JSON.stringify({ action: 'setting_updated', setting, value }));
        }
    } catch (error) {
        console.error('Ошибка обновления настройки:', error);
        if (WebApp && WebApp.showAlert) {
            WebApp.showAlert('Не удалось обновить настройку');
        } else {
            alert('Не удалось обновить настройку');
        }
    }
}

// Вспомогательные функции
function formatDate(dateStr) {
    const date = parseDate(dateStr);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

function parseDate(dateStr) {
    if (dateStr.includes('-')) {
        return new Date(dateStr);
    }
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
}

function getDaysLeft(dateStr) {
    const date = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
}

function getDaysLeftText(days) {
    if (days < 0) return 'Просрочено';
    if (days === 0) return 'Сегодня!';
    if (days === 1) return 'Завтра';
    return `Через ${days} дней`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
