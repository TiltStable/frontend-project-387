# 5. Инструментальное окружение: mise, hk, oxlint/oxfmt

Дата: 2026-10-30
Статус: Принято

## Контекст

Версии инструментов должны быть воспроизводимы локально и в CI. Курс
рекомендует mise для инструментов, задач и фоновых процессов и hk для
git-хуков. Рабочая машина — Windows 10. Рекомендация dev-quality-gates:
быстрые линтеры, один вход в проверки.

## Решение

- [mise](https://mise.jdx.dev/): `mise.toml` фиксирует node (24), hk,
  pitchfork; задачи (`mise run check`); daemons для dev-серверов бекенда и
  фронтенда (experimental). На машине разработчика mise установлен на диск D
  (`MISE_DATA_DIR=D:\mise\data`).
- Git-хуки через hk (`hk.pkl`): pre-commit гоняет lint и format, commit-msg
  проверяет Conventional Commits.
- Линт: oxlint, формат: oxfmt. Типы: `tsc --noEmit` (strict).
- Единая команда проверок: `npm run check` (lint → format → typecheck →
  test → build). Она же вызывается как `mise run check` локально и в
  GitHub Actions (`jdx/mise-action`). Все npm-скрипты работают и без mise:
  контейнер проверки Хекслета mise не содержит.

## Последствия

- Красная команда `check` блокирует коммит (хук) и пуш (CI): один и тот же
  набор правил на машине и в облаке.
- Windows — наименее зрелая платформа mise: daemons могут вести себя иначе,
  поэтому дублирующие npm-скрипты `dev:backend` / `dev:frontend` сохранены.
- Служебные файлы Хекслета (`.github/workflows/hexlet-check.yml`) исключены
  из format-гейта: их нельзя менять.
