import { User, Disc, Calendar, Tag, FileText, ExternalLink } from 'lucide-react'
import type { AudioFile } from '../../types/audio'
import { ImageSearchBlock } from './ImageSearchBlock'

interface SongInfoProps {
  audioFile: AudioFile
}

export function SongInfo({ audioFile }: SongInfoProps) {
  const { artist, title, album, coverArt, year, genre, geniusUrl } = audioFile

  return (
    <div className="mx-auto w-full max-w-6xl p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {coverArt && (
          <div className="mx-auto shrink-0 md:mx-0">
            <img
              src={coverArt}
              alt={`${artist} - ${title}`}
              className="h-32 w-32 rounded-xl object-cover shadow-md"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1 space-y-4">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">{title}</h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3">
                <div className="flex items-start gap-2">
                  <User size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Исполнитель</div>
                    <div className="font-medium text-neutral-900 dark:text-white">{artist}</div>
                  </div>
                </div>

                {album && (
                  <div className="flex items-start gap-2">
                    <Disc size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Альбом</div>
                      <div className="font-medium text-neutral-900 dark:text-white">{album}</div>
                    </div>
                  </div>
                )}
              </div>

              {(year || genre) && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3">
                  {year && (
                    <div className="flex items-start gap-2">
                      <Calendar size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Год</div>
                        <div className="font-medium text-neutral-900 dark:text-white">{year}</div>
                      </div>
                    </div>
                  )}
                  {genre && (
                    <div className="flex items-start gap-2">
                      <Tag size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Жанр</div>
                        <div className="font-medium text-neutral-900 dark:text-white">{genre}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {geniusUrl && (
                <div className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-500">Текст песни</div>
                    <a
                      href={geniusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 underline-offset-2 hover:underline"
                    >
                      Открыть на Genius
                      <ExternalLink size={13} className="opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 lg:max-w-sm xl:max-w-md">
            <ImageSearchBlock audioFile={audioFile} placement="aside" />
          </div>
        </div>
      </div>
    </div>
  )
}
