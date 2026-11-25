# Инструменты для мультиков

| Инструмент | Что делает | Как вызвать |
|---|---|---|
| Remotion | собирает видео из кода (3D-сцены мультфильмов) | `cd pisa-short/app && npx remotion render ...` |
| HyperFrames | рисует графику и анимацию из HTML | `cd tools && npx hyperframes init / render` |
| FFmpeg | режет, склеивает, сводит звук | `ffmpeg ...` |
| Whisper | пишет субтитры (faster-whisper, CPU) | `python3 tools/subtitles.py <видео или аудио> <out.srt> [язык]` |
| Субтитры по слову | крупные слова как в рилсах (ASS + FFmpeg) | `python3 tools/captions.py words.json out.ass`, затем `ffmpeg -i in.mp4 -vf "ass=out.ass:fontsdir=tools/fonts" out.mp4` |
| yt-dlp | скачивает видео-референсы | `yt-dlp <ссылка>` (нужен доступ сети к сайту) |

Модель Whisper (small, ~480 МБ) скачивается в `tools/models/` и в git не хранится.
