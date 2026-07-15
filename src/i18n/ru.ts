export const ru = {
  // Home
  home_track_title: 'исследуй песню',
  home_track_desc: 'Узнай автора и продюсера, читай текст песни, смотри кто сделал кавер или взял сэмпл, количество прослушиваний и просмотров на разных сервисах и ссылки.',
  home_slicer_title: 'вырежи фрагменты\nи скачай',
  home_slicer_desc: 'Загрузи файл, выбери начало и конец фрагментов, обрежь и скачай. Посмотри текст песни и найди фото исполнителя.',

  // SongInfo page — search
  search_placeholder: 'Исполнитель или название песни…',
  search_button: 'Найти',
  search_error: 'Ошибка поиска. Проверьте соединение с сервером.',
  track_error: 'Не удалось загрузить информацию о треке.',
  loading: 'Загружаем данные…',
  loading_short: 'Загружаем…',
  search_hint: 'Введите название, чтобы начать поиск',

  // SongInfo page — track card
  preview_unavailable: 'Превью недоступно',
  popularity: 'Популярность',

  // SongInfo page — meta labels
  label_producer: 'Продюсер',
  label_writers: 'Авторы',
  label_release_date: 'Дата выхода',
  label_country: 'Страна',
  label_lyrics: 'Текст песни',
  label_lyric_views: 'Просмотры текста',

  // SongInfo page — relationships
  rel_samples: 'Сэмплирует',
  rel_sampled_in: 'Сэмплировали',
  rel_cover_of: 'Кавер на',
  rel_covered_by: 'Каверы',
  rel_remix_of: 'Ремикс на',
  rel_remixes: 'Ремиксы',
  rel_interpolates: 'Интерполирует',
  rel_interpolated_by: 'Интерполировали',
  rel_live_version_of: 'Live-версия',

  // SongInfo page — service links
  link_open: '→ Открыть',
  link_watch: '→ Смотреть',
  link_find: '→ Найти',
  link_chart: '→ Чарт',

  // SongInfo page — stats
  stat_listeners: 'Слушателей',
  stat_playcount: 'Прослушиваний',
  stat_views: 'Просмотров',
  stat_likes: 'Лайков',
  stat_performances: 'Исполнений',
  stat_first: 'Первое',
  stat_last: 'Последнее',
  video_not_found: 'Видео не найдено',
  yandex_music: 'Яндекс Музыка',

  // Editor — FileUpload
  upload_button: 'Загрузить файл',
  uploading: 'Загрузка...',
  upload_another: 'Загрузить другой',
  upload_drag: 'или перетащите файл сюда',
  upload_hint: 'Только .mp3, максимум 50 МБ',

  // Editor — ProcessButton
  trim_one: 'Обрезать фрагмент',
  trim_many: 'Обрезать фрагменты',
  processing_one: 'Обработка фрагмента…',
  processing_many: 'Обработка фрагментов…',

  // Editor — TrimControls
  trim_start: 'Начало',
  trim_end: 'Конец',
  trim_slice_label: 'Вариант',
  trim_remove_aria: 'Удалить вариант обрезки',

  // Editor — MultiTrimPanel
  add_slice: 'Выбрать ещё фрагмент',

  // Editor — FadeControls
  fade_in_add: 'Добавить нарастание звука',
  fade_out_add: 'Добавить затухание звука',
  fade_in_title: 'Нарастание громкости',
  fade_out_title: 'Затухание громкости',
  fade_sec: 'с',

  // Editor — SongStructurePanel
  section_intro: 'Интро',
  section_outro: 'Аутро',
  section_verse: 'Куплет',
  section_pre_chorus: 'Пред-припев',
  section_chorus: 'Припев',
  section_post_chorus: 'Пост-припев',
  section_bridge: 'Бридж',
  section_unknown: 'Неизвестно',

  // Editor — SongInfo component
  lyrics_label: 'Текст песни',

  // Editor — ProcessedResults
  duration_label: 'Длительность',
  download_one: 'Скачать файл',
  download_many: 'Скачать файлы',
  play_aria: 'Воспроизвести',
  pause_aria: 'Пауза',
  mute_aria: 'Выключить звук',
  unmute_aria: 'Включить звук',

  // Editor — WaveformDisplay
  waveform_playhead_aria: 'Позиция воспроизведения, перетащите для перемотки',
  waveform_start_aria: 'Начало фрагмента',
  waveform_end_aria: 'Конец фрагмента',

  // Editor — ImageSearchBlock
  find_photo: 'Найти фото',

  // Editor — Editor page
  close: 'Закрыть',
};

export type Translations = typeof ru;
