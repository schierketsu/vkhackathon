import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, Typography, Button, SearchInput, Flex } from '@maxhub/max-ui';
import api, { Teacher } from '../api/client';
import { debounce } from '../utils/debounce';

function TeachersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [favorites, setFavorites] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await api.getFavoriteTeachers();
      setFavorites(data);
    } catch (error) {
      console.error('Ошибка загрузки избранных:', error);
    }
  }, []);

  const searchTeachers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTeachers([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchTeachers(query);
      setTeachers(data);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      searchTeachers(query);
    }, 300),
    [searchTeachers]
  );

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      setTeachers([]);
    }
  }, [searchQuery, debouncedSearch]);

  const toggleFavorite = useCallback(async (teacher: Teacher, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await api.removeFavoriteTeacher(teacher.name);
      } else {
        await api.addFavoriteTeacher(teacher.name);
      }
      loadFavorites();
    } catch (error) {
      console.error('Ошибка изменения избранного:', error);
    }
  }, [loadFavorites]);

  const favoriteNames = useMemo(() => 
    new Set(favorites.map(t => t.name)),
    [favorites]
  );

  const isFavorite = useCallback((teacherName: string): boolean => {
    return favoriteNames.has(teacherName);
  }, [favoriteNames]);

  const displayTeachers = useMemo(() => 
    showFavorites ? favorites : teachers,
    [showFavorites, favorites, teachers]
  );

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Flex gap={10} wrap="wrap" style={{ marginTop: 0, marginBottom: 0 }}>
          <Button
            mode={!showFavorites ? 'primary' : 'secondary'}
            onClick={() => setShowFavorites(false)}
            style={{ 
              fontWeight: !showFavorites ? 600 : 500,
              padding: '8px 16px'
            }}
          >
Поиск
          </Button>
          <div
            onClick={() => setShowFavorites(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: showFavorites ? '#2980F2' : '#F5F5F5',
              color: showFavorites ? '#FFFFFF' : '#000000',
              fontWeight: showFavorites ? 600 : 500,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!showFavorites) {
                e.currentTarget.style.backgroundColor = '#E8E8E8';
              }
            }}
            onMouseLeave={(e) => {
              if (!showFavorites) {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
              }
            }}
          >
            <img 
              src="/стар.png" 
              alt="⭐" 
              style={{
                width: 16,
                height: 16,
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
                margin: 0,
                padding: 0,
              }}
            />
            Избранные {favorites.length > 0 && `(${favorites.length})`}
          </div>
          </Flex>
        </div>

        {!showFavorites && (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <SearchInput
              placeholder="Поиск преподавателя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <Flex justify="center" align="center" style={{ padding: '60px 0', minHeight: 200 }}>
              <Typography.Body style={{ color: 'var(--text-secondary)' }}>
                Поиск...
              </Typography.Body>
            </Flex>
          </div>
        ) : showFavorites && favorites.length === 0 ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Flex direction="column" align="center" gap={16}>
                  <img 
                    src="/стар.png" 
                    alt="⭐" 
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: 'contain',
                      opacity: 0.3,
                    }}
                  />
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    textAlign: 'center',
                    margin: 0
                  }}>
                    Нет избранных преподавателей
                  </Typography.Body>
                </Flex>
              </Flex>
            </CellSimple>
          </CellList>
        ) : !showFavorites && !searchQuery ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Flex direction="column" align="center" gap={16}>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    textAlign: 'center',
                    margin: 0
                  }}>
                    Введите имя для поиска
                  </Typography.Body>
                </Flex>
              </Flex>
            </CellSimple>
          </CellList>
        ) : displayTeachers.length === 0 ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Typography.Body variant="small" style={{ 
                  color: 'var(--text-secondary)',
                  fontSize: 14
                }}>
                  Ничего не найдено
                </Typography.Body>
              </Flex>
            </CellSimple>
          </CellList>
        ) : (
          <CellList mode="island" filled style={{ gap: 10 }}>
            {displayTeachers.map((teacher, index) => {
              const fav = isFavorite(teacher.name);
              return (
                <CellSimple
                  key={index}
                  onClick={() => navigate(`/teachers/${encodeURIComponent(teacher.name)}`)}
                  style={{
                    background: fav ? 'var(--background-surface-ground)' : undefined,
                  }}
                  after={
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(teacher, fav);
                      }}
                      mode="tertiary"
                      style={{ 
                        minWidth: 36,
                        height: 36,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img 
                        src="/стар.png" 
                        alt={fav ? "⭐" : "☆"} 
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: 'contain',
                          opacity: fav ? 1 : 0.3,
                        }}
                      />
                    </Button>
                  }
                  title={teacher.name}
                  showChevron
                />
              );
            })}
          </CellList>
        )}
      </Grid>
    </Container>
  );
}

export default TeachersPage;

