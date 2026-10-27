import { Translations } from './ru';

export const en: Translations = {
  // Home
  home_track_title: 'discover the track',
  home_track_desc: 'Find out the artist, producer, and songwriters. Read lyrics, see who covered or sampled it, stream counts across services, and direct links.',
  home_slicer_title: 'cut slices & download',
  home_slicer_desc: 'Upload a file, pick start and end points, trim and download. View lyrics and find artist photos.',

  // SongInfo page — search
  search_placeholder: 'Artist or track name…',
  search_button: 'Search',
  search_error: 'Search failed. Check your connection to the server.',
  track_error: 'Failed to load track info.',
  loading: 'Loading…',
  loading_short: 'Loading…',
  search_hint: 'Enter a name to start searching',
  search_section_artists: 'Artists',
  search_section_tracks: 'Tracks',
  search_section_albums: 'Albums',
  search_section_related: 'Similar Artists',
  search_followers: 'followers',
  albums_not_found: 'No albums found',
  tracks_label: 'tr.',

  // SongInfo page — track card
  preview_unavailable: 'Preview unavailable',
  popularity: 'Popularity',

  // SongInfo page — meta labels
  label_producer: 'Producer',
  label_writers: 'Writers',
  label_release_date: 'Release date',
  label_country: 'Country',
  label_lyrics: 'Lyrics',
  label_lyric_views: 'Lyric views',

  // SongInfo page — relationships
  rel_samples: 'Samples',
  rel_sampled_in: 'Sampled in',
  rel_cover_of: 'Cover of',
  rel_covered_by: 'Covered by',
  rel_remix_of: 'Remix of',
  rel_remixes: 'Remixes',
  rel_interpolates: 'Interpolates',
  rel_interpolated_by: 'Interpolated by',
  rel_live_version_of: 'Live version of',

  // SongInfo page — service links
  link_open: '→ Open',
  link_watch: '→ Watch',
  link_download: '↓ Download',
  link_find: '→ Find',
  link_chart: 'Chart',

  // SongInfo page — stats
  stat_listeners: 'Listeners',
  stat_playcount: 'Plays',
  stat_views: 'Views',
  stat_likes: 'Likes',
  stat_performances: 'Performances',
  stat_first: 'First',
  stat_last: 'Last',
  video_not_found: 'Video not found',
  yandex_music: 'Yandex Music',

  // Editor — FileUpload
  upload_button: 'Upload file',
  uploading: 'Uploading...',
  upload_another: 'Upload another',
  upload_drag: 'or drag & drop here',
  upload_hint: 'MP3 only, max 50 MB',

  // Editor — ProcessButton
  trim_one: 'Trim slice',
  trim_many: 'Trim slices',
  processing_one: 'Processing slice…',
  processing_many: 'Processing slices…',

  // Editor — TrimControls
  trim_start: 'Start',
  trim_end: 'End',
  trim_slice_label: 'Slice',
  trim_remove_aria: 'Remove slice',
  // Editor — errors and file names
  unknown_artist: 'Unknown artist',
  err_only_mp3: 'Only MP3 files are supported',
  err_file_too_large: 'The file must not exceed 50 MB',
  err_upload_failed: 'Failed to load the file. Make sure it is a valid MP3.',
  err_audio_unavailable: 'Audio data is unavailable. Please upload the file again.',
  err_processing: 'Audio processing failed:',
  err_bad_range: 'Invalid trim range',
  err_time_negative: 'Time cannot be negative',
  err_start_after_end: 'Start must be before end',
  err_end_after_duration: 'End cannot exceed the track duration',
  fragment_file_suffix: 'fragment',
  err_request: 'Request failed',

  // Editor — MultiTrimPanel
  add_slice: 'Add another slice',

  // Editor — FadeControls
  fade_in_add: 'Add fade in',
  fade_out_add: 'Add fade out',
  fade_in_title: 'Fade in',
  fade_out_title: 'Fade out',
  fade_sec: 's',

  // Editor — SongStructurePanel
  section_intro: 'Intro',
  section_outro: 'Outro',
  section_verse: 'Verse',
  section_pre_chorus: 'Pre-chorus',
  section_chorus: 'Chorus',
  section_post_chorus: 'Post-chorus',
  section_bridge: 'Bridge',
  section_unknown: 'Unknown',

  // Editor — SongInfo component
  lyrics_label: 'Lyrics',

  // Editor — ProcessedResults
  duration_label: 'Duration',
  download_one: 'Download file',
  download_many: 'Download files',
  play_aria: 'Play',
  pause_aria: 'Pause',
  mute_aria: 'Mute',
  unmute_aria: 'Unmute',

  // Editor — WaveformDisplay
  waveform_playhead_aria: 'Playhead, drag to seek',
  waveform_start_aria: 'Slice start',
  waveform_end_aria: 'Slice end',

  // Editor — ImageSearchBlock
  find_photo: 'Find photo',

  // Editor — Editor page
  close: 'Close',

  // Feedback modal
  feedback_button: 'Send feedback',
  feedback_title: 'Feedback',
  feedback_placeholder: 'Leave a review or suggestion, add your contact for a reply',
  feedback_contact_placeholder: 'Telegram or name (optional)',
  feedback_send: 'Send',
  feedback_sending: 'Sending…',
  feedback_success: 'Thank you! We received your feedback.',
  feedback_error: 'Failed to send. Please try again later.',

  // SongInfo page — artist/album info panel
  info_more: 'More',
  info_less: 'Less',
  info_members: 'Members',
  info_present: 'present',
  info_label: 'Label',
  info_genres: 'Genres',
  info_critics: 'Critic ratings',
  info_community: 'MusicBrainz user rating',
  info_singles: 'Singles',
  info_charts: 'Chart peaks',
  info_certifications: 'Certifications',
  info_personnel: 'Personnel',
  info_expand: 'Show all',
  info_single_badge: 'single',
  back_to_album: 'Back to',
  back_to_artist: 'Back to',
  back_to_search: 'Back to search results',
  show_more: 'Show more',
  collapse: 'Show less',
  info_votes: 'votes',
  info_wiki_ru: 'Wikipedia RU',
  info_wiki_en: 'Wikipedia',
  info_source: 'Text: Wikipedia, CC BY-SA',
};
