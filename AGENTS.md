# AGENTS.md

Учебный проект Хекслета «Календарь звонков»: владелец публикует типы встреч
и доступное время, гость без регистрации бронирует свободный слот.

## Структура

- `apps/backend` — API на Hono (TypeScript), порт 3000 (env `PORT`).
- `apps/frontend` — React 19 + Vite + Mantine, порт 5173.
- `contracts` — TypeSpec-контракт API. `contracts/tsp-output/` генерируется,
  руками не править.
- `apps/frontend/src/api-client` — клиентский SDK, генерируется из OpenAPI,
  руками не править.

Любая правка API начинается с контракта: `contracts/*.tsp` → `npm run gen`
(TypeSpec → OpenAPI → SDK одной цепочкой) → код бекенда и фронтенда.
`npm run gen:check` дополнительно проверяет, что закоммиченные артефакты
совпадают с генерацией (используется в `mise run check`).

## Команды

Инструменты и версии зафиксированы в `mise.toml` (Node >= 22.18, фактически 24
через mise). Все npm-скрипты работают и без mise.

- `mise run check` — полный набор: lint, format, typecheck, тесты, build,
  повторная генерация контракта/SDK с проверкой отсутствия изменений
  (`npm run gen:check`) и браузерный e2e против настоящих серверов
- `npm run check` — линтер, формат, типы, тесты, сборка (без e2e и gen:check:
  набор для окружений без браузеров и git, как контейнер Хекслета)
- `mise daemons start` / `mise daemons stop` / `mise daemons status` — фоновые
  dev-серверы (backend + frontend)
- `npm run dev:backend` / `npm run dev:frontend` — те же серверы по отдельности
- `npm test` — Vitest
- `npm run e2e` — Playwright-сценарий бронирования против настоящих серверов
  (перед первым запуском: `npx playwright install chromium`)
- `npm run lint` / `npm run format:check` — oxlint и oxfmt
- `npm run contract:build` — TypeSpec → OpenAPI
- `npm run client:generate` — OpenAPI → TypeScript SDK

## Агент в GitHub

Комментарий `/zc <запрос>` (или `/zcode`) в issue, PR или к строке diff
запускает агента на раннере GitHub Actions (`.github/workflows/zcode.yml`).
Ответ приходит комментарием в то же обсуждение. Модель — GLM через
Anthropic-совместимый API Z.AI, ключ — в секрете `Z_AI_API_KEY`. Правила
проекта агент читает из этого файла и из `docs/agents/` в рабочей копии.

## Правила

- Коммиты строго по Conventional Commits (`feat:`, `fix:`, ...); commit-msg
  хук отклоняет остальные форматы.
- Коммит реализации ссылается на тикет, который закрывает:
  `feat: запись на свободный слот (#12)`.
- Не менять `.github/workflows/hexlet-check.yml`.
- Не править руками сгенерированное (`contracts/tsp-output/`,
  `apps/frontend/src/api-client/`) — только перегенерация через `npm run gen`.
- Новая функциональность — с тестами (Vitest).

## Скиллы и агентная разработка

Работа с трекером (GitHub Issues) описана в
[docs/agents/tracker.md](docs/agents/tracker.md): порядок чтения (карта
решений #1 и спецификация #2 — issues исходного проекта 386 → GLOSSARY →
открытые тикеты этого репозитория), конвенции тикетов и зависимости.

Процедура реализации спецификации —
[docs/agents/implement-spec.md](docs/agents/implement-spec.md): цикл
«контракт → генерация → сервер (TDD) → интерфейс → проверки → коммит (#N)»
и мутационная проверка правил бронирования (красный/зелёный прогон в
отдельной рабочей копии с записью в тикет).

Скиллы, применяемые агентом в этом проекте:

- планирование нетривиальных изменений: исследование → план → adversarial
  проверка плана до реализации (plan-verifier);
- TDD: тесты до реализации, красный → зелёный цикл на каждый тикет;
- ревью перед пушем: код-ревью, поиск тихих сбоев (silent failures),
  adversarial-верификация отчёта (все «готово»-claims перезапускаются
  командами);
- security: secret_scanner перед каждым пушем;
- деплой: сервис на Render (см. README «Docker и деплой»), автоматизация
  через Render API/MCP (нужен `RENDER_API_KEY` в окружении или OAuth;
  настройка описана в README «MCP-сервер Render»).
