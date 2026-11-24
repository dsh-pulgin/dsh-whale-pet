/**
 * Whale-girl desktop pet — Client half.
 *
 * Renders into the frame-wide `shell.overlay` slot and derives her pose from
 * the Session shown in the main view, so she reacts to what that Agent is
 * doing:
 *   idle    — nothing running: dozes off and shows the account balance
 *   working — the Agent is running: concentrate face, bobbing
 *   waiting — an approval, plan review, or question is pending: waves with an
 *             alert badge
 *   done    — the run just finished: hops
 *
 * Requirements: `slots` and `locale`. The balance read is optional and only
 * installs when the Remote account services and their access grant exist.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-whale-pet',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'whale.pet'
    /**
     * Package-asset route: `/plugins/<package>/assets/<emitted path>`.
     * The route serves these with an immutable cache and an ETag equal to the
     * path, so a file's name carries a content revision: replacing artwork
     * means renaming it (and updating this map), never overwriting in place.
     */
    const ASSET_BASE = 'plugins/@local/dsh-whale-pet/assets/'
    const POSE_FILES = {
      idle: 'whale-idle-6bdaf4bf8794.png',
      // Full body, facing the viewer: she gloats over plain rice (tokens) while
      // the Agent runs.
      working: 'whale-eating-d5ae447c7b60.png',
      waiting: 'whale-happy-a3bd65a9b06b.png',
      done: 'whale-happy-a3bd65a9b06b.png',
    }
    const COLLAPSE_KEY = 'dsh.whale-pet.bubble-collapsed'
    const POSITION_KEY = 'dsh.whale-pet.position'
    const AFFINITY_KEY = 'dsh.whale-pet.affinity'
    const CHAT_PATH = 'whale-pet/chat'
    const MAX_TURNS = 40
    const DRAG_THRESHOLD = 4
    const PET_MARGIN = 8
    const AFFINITY_CAP = 1_000_000
    const PET_POINTS = 1
    const FEED_POINTS = 3
    const FEED_COOLDOWN_MS = 120_000
    const REACTION_MS = 420
    const EAT_MS = 620
    const HOP_MS = 700
    const SUPPRESS_CLICK_MS = 350
    const IDLE_MIN_MS = 75_000
    const IDLE_MAX_MS = 150_000
    const BALANCE_POLL_MS = 90_000
    const BALANCE_MIN_GAP_MS = 45_000
    const BALANCE_GRACE_MS = 12_000
    const CELEBRATE_MS = 7_000
    const EMPTY_STATUS = new Map()
    const EMPTY_LIST = { ids: [], byId: {} }

    const EN = {
      'pet.label': 'Whale-girl desktop pet',
      'pet.toggleShow': 'Click to show the bubble',
      'status.idle': 'Idle',
      'status.working': 'Working…',
      'status.workingRice': 'munching tokens like rice',
      'status.finished': 'Run finished',
      'status.approval': 'Approval needed',
      'status.question': 'Question for you',
      'status.plan': 'Plan review',
      'status.waiting': 'Waiting for you',
      'balance.label': 'Balance',
      'balance.loading': 'Reading balance…',
      'balance.signedOut': 'Not signed in',
      'balance.error': 'Balance unavailable',
      'balance.bonus': 'Includes {amount} bonus',
      'chat.placeholder': 'Say something…',
      'chat.send': 'Send',
      'chat.offline': 'Mm… my head is stuck. Try again in a moment~',
      'pet.close': 'Hide the bubble',
      'pet.feed': 'Feed her a little cake',
      'pet.feedWait': 'I just ate~',
      'pet.patHint': 'Click to pet her',
      'pet.level': 'Affinity Lv.{level}',
      'pet.levelUp': 'Affinity Lv.{level}! Thank you, master~',
      'pat.head.1': 'Ehehe, head pats are the best~',
      'pat.head.2': 'Mmm… a little more, please?',
      'pat.body.1': 'Wah! You startled me!',
      'pat.body.2': 'Careful, my apron wrinkles~',
      'pat.tail.1': 'Hyaa! Not the tail!',
      'pat.tail.2': 'Th-that tickles… don\u2019t pull it!',
      'feed.1': 'Nom nom… so sweet, thank you!',
      'feed.2': 'Cake! You spoil me, master~',
      'idle.1': 'The sea is quiet today…',
      'idle.2': 'I polished my apron three times already.',
      'idle.3': 'Call me whenever you need me~',
      'idle.poor': 'Um… the balance is getting low, master.',
      'drag.pick': 'Wah—where are we going?',
      'drag.drop': 'Ooh, a new spot! I like it here.',
    }
    const ZH = {
      'pet.label': '深海女仆桌宠',
      'pet.toggleShow': '点击展开气泡',
      'status.idle': '空闲中',
      'status.working': '工作中…',
      'status.workingRice': '偷偷扒饭中（token）',
      'status.finished': '跑完啦！',
      'status.approval': '等你审批',
      'status.question': '等你回答',
      'status.plan': '等你确认计划',
      'status.waiting': '等你确认',
      'balance.label': '余额',
      'balance.loading': '读取余额…',
      'balance.signedOut': '未登录',
      'balance.error': '余额不可用',
      'balance.bonus': '含赠送 {amount}',
      'chat.placeholder': '跟人家说点什么…',
      'chat.send': '发送',
      'chat.offline': '唔…人家脑子卡住了，等下再试试好不好~',
      'pet.close': '收起气泡',
      'pet.feed': '喂她一块小蛋糕',
      'pet.feedWait': '人家刚吃过啦~',
      'pet.patHint': '点击摸摸头',
      'pet.level': '亲密度 Lv.{level}',
      'pet.levelUp': '亲密度到 Lv.{level} 啦，谢谢主人~',
      'pat.head.1': '嘿嘿，摸头最舒服啦~',
      'pat.head.2': '唔…再摸一下下嘛。',
      'pat.body.1': '呜哇！吓人家一跳！',
      'pat.body.2': '轻一点啦，围裙会皱的~',
      'pat.tail.1': '呀！尾巴不能乱碰的！',
      'pat.tail.2': '好、好痒…别揪啦！',
      'feed.1': '啊呜啊呜…好甜，谢谢主人！',
      'feed.2': '是小蛋糕！主人最好了~',
      'idle.1': '今天的海面好安静呀…',
      'idle.2': '围裙人家已经熨过三遍啦。',
      'idle.3': '主人需要人家的时候，喊一声就好~',
      'idle.poor': '那个…余额好像快见底了哦。',
      'drag.pick': '呜哇——要带人家去哪里呀？',
      'drag.drop': '哦哦，这里视野不错！人家喜欢这里~',
    }

    const CSS = `
.whale-pet {
  position: fixed;
  /* Clear of both floating host controls in this corner: the composer card
     (which grows upward as the draft gets longer) and the scroll-to-bottom
     button pinned at composerHeight + 16px. */
  right: 16px;
  bottom: 208px;
  display: block;
  pointer-events: none;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
.whale-pet__bubble {
  /* Out of flow so opening the panel never moves the pet herself. */
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  pointer-events: auto;
  max-width: 240px;
  padding: 6px 11px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: var(--dsw-elevation-panel, 0 6px 18px rgb(0 0 0 / 12%));
  animation: whale-pet-bubble-in 180ms ease-out;
}
.whale-pet[data-bubble-below='true'] .whale-pet__bubble {
  top: calc(100% + 8px);
  bottom: auto;
}
.whale-pet[data-bubble-below='true'] .whale-pet__bubble::after {
  top: -5px;
  bottom: auto;
  transform: rotate(225deg);
}
.whale-pet__bubble::after {
  content: '';
  position: absolute;
  right: 20px;
  bottom: -5px;
  width: 8px;
  height: 8px;
  border-right: 1px solid var(--dsw-alias-border-l1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  transform: rotate(45deg);
}
.whale-pet__line {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.whale-pet__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-label-secondary);
}
.whale-pet__main {
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.whale-pet__action {
  flex: none;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  display: grid;
  place-items: center;
  background: none;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.whale-pet__action:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.whale-pet__action:disabled,
.whale-pet__action[aria-disabled='true'] {
  opacity: 0.4;
}
.whale-pet__action:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.whale-pet__action svg {
  display: block;
  width: 13px;
  height: 13px;
}
.whale-pet__detail {
  max-width: 100%;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.whale-pet__chat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 132px;
  margin-top: 5px;
  overflow-y: auto;
  overscroll-behavior: contain;
  text-align: left;
}
.whale-pet__turn {
  max-width: 100%;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 17px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-primary);
}
.whale-pet__turn[data-role='user'] {
  align-self: flex-end;
  background: var(--dsw-alias-bg-layer-2);
}
.whale-pet__turn[data-role='pet'] {
  align-self: flex-start;
  padding-left: 0;
}
.whale-pet__turn[data-pending='true'] {
  color: var(--dsw-alias-label-secondary);
}
.whale-pet__composer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.whale-pet__composer:focus-within {
  border-top-color: var(--dsw-alias-brand-primary);
}
.whale-pet__input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  outline: none;
}
.whale-pet__input::placeholder {
  color: var(--dsw-alias-label-secondary);
}
.whale-pet__input:disabled {
  opacity: 0.6;
}
.whale-pet__send {
  flex: none;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-overlay);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.whale-pet__send:disabled {
  opacity: 0.45;
  cursor: default;
}
.whale-pet__send:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.whale-pet__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.whale-pet__stage {
  position: relative;
  display: block;
  pointer-events: none;
}
.whale-pet__button {
  pointer-events: auto;
  display: block;
  width: var(--whale-pet-size, 120px);
  height: var(--whale-pet-size, 120px);
  padding: 0;
  border: 0;
  border-radius: 22px;
  background: none;
  color: inherit;
  cursor: grab;
  /* Dragging must not scroll the page on touch devices. */
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}
.whale-pet__button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 3px;
}
.whale-pet__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 50% 92%;
  filter: drop-shadow(0 6px 10px rgb(15 34 63 / 22%));
  user-select: none;
  -webkit-user-drag: none;
}
.whale-pet[data-dragging='true'] .whale-pet__button { cursor: grabbing; }
.whale-pet[data-dragging='true'] .whale-pet__image {
  animation: none !important;
  transform: none;
  filter: drop-shadow(0 12px 18px rgb(15 34 63 / 30%));
}
.whale-pet__badge {
  position: absolute;
  top: 2px;
  right: 4px;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border: 2px solid var(--dsw-alias-state-warn-primary);
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-overlay);
  animation: whale-pet-badge-pop 220ms ease-out;
}
.whale-pet[data-state='working'] .whale-pet__dot { background: var(--dsw-alias-brand-primary); }
.whale-pet[data-state='waiting'] .whale-pet__dot { background: var(--dsw-alias-state-warn-primary); }
.whale-pet[data-state='done'] .whale-pet__dot { background: var(--dsw-alias-label-primary); }
.whale-pet[data-state='idle'] .whale-pet__image { animation: whale-pet-breathe 4.2s ease-in-out infinite; }
.whale-pet[data-state='working'] .whale-pet__image { animation: whale-pet-munch 1.9s ease-in-out infinite; }
.whale-pet[data-state='waiting'] .whale-pet__image { animation: whale-pet-wave 1.8s ease-in-out infinite; }
.whale-pet[data-state='done'] .whale-pet__image { animation: whale-pet-hop 700ms ease-in-out 3; }
.whale-pet[data-pat='true'] .whale-pet__image { animation: whale-pet-pat 420ms ease-out; }
.whale-pet[data-eat='true'] .whale-pet__image { animation: whale-pet-eat 620ms ease-out; }
.whale-pet[data-hop='true'] .whale-pet__image { animation: whale-pet-hop 700ms ease-in-out 1; }
@keyframes whale-pet-bubble-in {
  from { opacity: 0; transform: translateY(4px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes whale-pet-badge-pop {
  from { opacity: 0; transform: scale(0.6); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes whale-pet-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.015); }
}
@keyframes whale-pet-munch {
  0%, 100% { transform: translateY(0) rotate(-0.4deg); }
  50% { transform: translateY(-2px) rotate(0.4deg); }
}
@keyframes whale-pet-wave {
  0%, 100% { transform: rotate(-3.5deg) translateY(0); }
  50% { transform: rotate(3.5deg) translateY(-2px); }
}
@keyframes whale-pet-hop {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-12px) scale(1.02, 0.98); }
  60% { transform: translateY(0) scale(1.04, 0.96); }
}
@keyframes whale-pet-pat {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-4px) scale(1.06, 0.96); }
  62% { transform: translateY(0) scale(0.98, 1.02); }
}
@keyframes whale-pet-eat {
  0%, 100% { transform: translateY(0) rotate(0); }
  25% { transform: translateY(-6px) rotate(-3deg); }
  55% { transform: translateY(-2px) rotate(3deg); }
  80% { transform: translateY(-4px) rotate(-2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .whale-pet__image { animation: none !important; }
  .whale-pet__bubble { animation: none !important; }
  .whale-pet__badge { animation: none !important; }
}
@media (max-width: 760px) {
  .whale-pet {
    --whale-pet-size: 96px;
    right: 8px;
    bottom: 168px;
    font-size: 12px;
    line-height: 18px;
  }
  .whale-pet__bubble { max-width: 200px; }
}
@media (max-width: 560px) {
  .whale-pet { display: none; }
}
`

    /** `¥12,345.68`, `-¥12.30`, `<¥0.01` — the account panel's own rules. */
    function formatAmount(wallet) {
      const symbol = wallet.currency === 'USD' ? '$' : '¥'
      const raw = Number(wallet.balance)
      if (!Number.isFinite(raw)) return symbol + wallet.balance
      const sign = raw < 0 ? '-' : ''
      const abs = Math.abs(raw)
      if (abs > 0 && abs < 0.01) return '<' + symbol + '0.01'
      return sign + symbol + abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    /**
     * Balance source shared by the Remote half and the view. The Remote half
     * replaces `refresh`; until then the pet simply shows no balance.
     */
    function createBalanceHub() {
      let snapshot = { phase: 'idle', wallets: [], bonusWallets: [], updatedAt: 0 }
      const listeners = new Set()
      const hub = {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        publish(next) {
          snapshot = next
          for (const listener of [...listeners]) {
            try {
              listener()
            } catch (error) {
              console.error('[whale-pet] balance subscriber failed', error)
            }
          }
        },
        refresh() {},
      }
      return hub
    }

    /** Stand-in source used only when the registration injected no hub. */
    let fallbackHub
    function idleHub() {
      fallbackHub ??= createBalanceHub()
      return fallbackHub
    }

    /** `useSyncExternalStore` with a fallback for older React runtimes. */
    function useHubSnapshot(hub) {
      if (typeof React.useSyncExternalStore === 'function') {
        return React.useSyncExternalStore(hub.subscribe, hub.getSnapshot)
      }
      const [value, setValue] = React.useState(hub.getSnapshot())
      React.useEffect(() => hub.subscribe(() => setValue(hub.getSnapshot())), [hub])
      return value
    }

    function readCollapsed() {
      try {
        return globalThis.localStorage?.getItem(COLLAPSE_KEY) === '1'
      } catch {
        return false
      }
    }

    function writeCollapsed(value) {
      try {
        globalThis.localStorage?.setItem(COLLAPSE_KEY, value ? '1' : '0')
      } catch {
        // A denied storage only costs the remembered choice.
      }
    }

    /** A remembered top-left viewport position, or null for the default seat. */
    function readPosition() {
      try {
        const raw = globalThis.localStorage?.getItem(POSITION_KEY)
        if (raw === undefined || raw === null || raw === '') return null
        const value = JSON.parse(raw)
        const x = Number(value?.x)
        const y = Number(value?.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null
        return { x, y }
      } catch {
        return null
      }
    }

    function writePosition(value) {
      try {
        if (value === null) globalThis.localStorage?.removeItem(POSITION_KEY)
        else globalThis.localStorage?.setItem(POSITION_KEY, JSON.stringify({ x: value.x, y: value.y }))
      } catch {
        // A denied storage only costs the remembered position.
      }
    }

    /** Keep the whole thing on screen: `width`/`height` bound the moved box. */
    function clampToViewport(width, height, x, y) {
      const viewportWidth = globalThis.innerWidth ?? 0
      const viewportHeight = globalThis.innerHeight ?? 0
      const maxX = Math.max(PET_MARGIN, viewportWidth - width - PET_MARGIN)
      const maxY = Math.max(PET_MARGIN, viewportHeight - height - PET_MARGIN)
      return {
        x: Math.min(Math.max(PET_MARGIN, Math.round(x)), maxX),
        y: Math.min(Math.max(PET_MARGIN, Math.round(y)), maxY),
      }
    }

    /** Bounded bond state this browser remembers. */
    function readAffinity() {
      try {
        const raw = globalThis.localStorage?.getItem(AFFINITY_KEY)
        if (raw === undefined || raw === null || raw === '') return { points: 0, lastFedAt: 0 }
        const value = JSON.parse(raw)
        const points = Math.max(0, Math.min(AFFINITY_CAP, Math.round(Number(value?.points) || 0)))
        const fed = Number(value?.lastFedAt)
        return { points, lastFedAt: Number.isFinite(fed) ? fed : 0 }
      } catch {
        return { points: 0, lastFedAt: 0 }
      }
    }

    function writeAffinity(value) {
      try {
        globalThis.localStorage?.setItem(AFFINITY_KEY, JSON.stringify({
          points: value.points,
          lastFedAt: value.lastFedAt,
        }))
      } catch {
        // A denied storage only costs the remembered bond.
      }
    }

    /** Lv.1 at 0 points, Lv.2 at 6, Lv.3 at 24, Lv.4 at 54, and so on. */
    function levelOf(points) {
      return 1 + Math.floor(Math.sqrt(Math.max(0, points) / 6))
    }

    /** A line from one pool that avoids repeating the previous one. */
    function pickLine(pool, previous) {
      const usable = pool.filter((line) => line !== '' && line !== previous)
      const source = usable.length === 0 ? pool.filter((line) => line !== '') : usable
      if (source.length === 0) return ''
      return source[Math.floor(Math.random() * source.length)]
    }

    /** A boolean that clears itself after `duration`, safe across unmounts. */
    function useTransient(duration) {
      const [active, setActive] = React.useState(false)
      const timer = React.useRef(undefined)
      React.useEffect(() => () => {
        if (timer.current !== undefined) clearTimeout(timer.current)
      }, [])
      const trigger = React.useCallback(() => {
        setActive(true)
        if (timer.current !== undefined) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          timer.current = undefined
          setActive(false)
        }, duration)
      }, [duration])
      return [active, trigger]
    }

    /** The Session whose main-view reference is held, i.e. the visible one. */
    function currentSessionId(list) {
      for (const id of list.ids) {
        const row = list.byId[id]
        if (row !== undefined && row !== null && (row.retainedBy?.mainView ?? 0) > 0) return id
      }
      return undefined
    }

    function waitingText(kind, t) {
      if (kind === 'approval') return t('status.approval')
      if (kind === 'question') return t('status.question')
      if (kind === 'plan-review') return t('status.plan')
      return t('status.waiting')
    }

    /** The visible wallet amount, or `''` while no balance is known. */
    function balanceText(balance, t) {
      if (balance.phase !== 'ready') return ''
      const amounts = balance.wallets.map(formatAmount)
      return t('balance.label') + ' ' + (amounts.length === 0 ? '0.00' : amounts.join(' / '))
    }

    /** Main line and optional detail line for the speech bubble. */
    function describe(pose, kind, balance, t) {
      if (pose === 'working') return { main: t('status.working'), detail: t('status.workingRice') }
      if (pose === 'waiting') return { main: waitingText(kind, t), detail: '' }
      if (pose === 'done') return { main: t('status.finished'), detail: '' }
      const idle = t('status.idle')
      if (balance.phase === 'ready') {
        const bonus = balance.bonusWallets
          .filter((wallet) => Number(wallet.balance) > 0)
          .map(formatAmount)
          .join(' + ')
        return {
          main: balanceText(balance, t),
          detail: bonus === '' ? idle : idle + ' · ' + t('balance.bonus', { amount: bonus }),
        }
      }
      const main = balance.phase === 'signed-out'
        ? t('balance.signedOut')
        : balance.phase === 'error' ? t('balance.error') : t('balance.loading')
      return { main, detail: idle }
    }

    /** Choose the pose from the visible Session's facts. */
    function poseOf(kind, running, celebrating) {
      if (kind !== undefined) return 'waiting'
      if (running) return 'working'
      if (celebrating) return 'done'
      return 'idle'
    }

    function WhalePet(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => EN[key] ?? key
      const useStatus = typeof props.useSessionStatus === 'function'
        ? props.useSessionStatus
        : (select) => select(EMPTY_STATUS)
      const useSessions = typeof props.useSessions === 'function'
        ? props.useSessions
        : (select) => select(EMPTY_LIST)
      const getLocale = typeof props.getLocale === 'function' ? props.getLocale : () => 'zh'
      const hub = props.balanceHub ?? idleHub()

      const list = useSessions((state) => state)
      const statuses = useStatus((state) => state)
      const balance = useHubSnapshot(hub)
      const [collapsed, setCollapsed] = React.useState(readCollapsed)
      const [celebrating, setCelebrating] = React.useState(false)
      const [hopId, setHopId] = React.useState(0)
      const [position, setPosition] = React.useState(readPosition)
      const [dragging, setDragging] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [turns, setTurns] = React.useState([])
      const [pending, setPending] = React.useState(false)
      const [affinity, setAffinity] = React.useState(readAffinity)
      const [patting, triggerPat] = useTransient(REACTION_MS)
      const [eating, triggerEat] = useTransient(EAT_MS)
      const [hopping, triggerHop] = useTransient(HOP_MS)
      const [bubbleBelow, setBubbleBelow] = React.useState(false)
      const [announced, setAnnounced] = React.useState('')
      const [selfTalkTick, setSelfTalkTick] = React.useState(0)
      const previous = React.useRef({ sessionId: undefined, running: false })
      const preloaded = React.useRef(false)
      const rootRef = React.useRef(null)
      const buttonRef = React.useRef(null)
      const bubbleRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const draggingRef = React.useRef(false)
      const suppressClickUntil = React.useRef(0)
      const inputRef = React.useRef(null)
      const chatRef = React.useRef(null)
      const wasCollapsed = React.useRef(collapsed)
      const lastSpeech = React.useRef('')
      const lowBalance = React.useRef(false)
      const level = levelOf(affinity.points)
      const levelRef = React.useRef(level)
      const [, setFeedTick] = React.useState(0)
      const wallet = balance.wallets[0]
      lowBalance.current = balance.phase === 'ready' && wallet !== undefined && Number(wallet.balance) < 10

      const sessionId = currentSessionId(list)
      const status = sessionId === undefined ? undefined : statuses.get(sessionId)
      const running = status !== undefined && status.running === true
      const kind = status === undefined || status.pendingInteraction === undefined || status.pendingInteraction === null
        ? undefined
        : String(status.pendingInteraction.kind ?? '')

      React.useEffect(() => {
        const was = previous.current
        previous.current = { sessionId, running }
        if (running) {
          setCelebrating(false)
          return undefined
        }
        // Only the same Session going quiet is a finished run; switching the
        // main view away from a running Session must not celebrate.
        if (was.running && was.sessionId === sessionId) {
          setCelebrating(true)
          setHopId((value) => value + 1)
          const timer = setTimeout(() => setCelebrating(false), CELEBRATE_MS)
          return () => clearTimeout(timer)
        }
        setCelebrating(false)
        return undefined
      }, [sessionId, running])

      React.useEffect(() => {
        if (!running && kind === undefined) hub.refresh()
      }, [running, kind, hub])

      React.useEffect(() => {
        if (preloaded.current) return
        preloaded.current = true
        for (const file of new Set(Object.values(POSE_FILES))) {
          const image = new Image()
          image.src = ASSET_BASE + file
        }
      }, [])

      // Remember the placement once the drag settles, and keep her on screen
      // when the window shrinks under a stored position.
      React.useEffect(() => {
        if (dragging) return
        writePosition(position)
      }, [position, dragging])

      const placed = position !== null
      React.useEffect(() => {
        if (!placed) return undefined
        const settle = () => {
          const root = rootRef.current
          if (root === null) return
          const rect = root.getBoundingClientRect()
          setPosition((value) => value === null
            ? value
            : clampToViewport(rect.width, rect.height, value.x, value.y))
        }
        settle()
        globalThis.addEventListener('resize', settle)
        return () => globalThis.removeEventListener('resize', settle)
      }, [placed])

      // Opening the panel is a request to type, so hand the caret over.
      React.useEffect(() => {
        if (wasCollapsed.current && !collapsed) inputRef.current?.focus()
        wasCollapsed.current = collapsed
      }, [collapsed])

      // Keep the newest line in view while she types.
      React.useEffect(() => {
        const node = chatRef.current
        if (node !== null) node.scrollTop = node.scrollHeight
      }, [turns, pending])

      React.useEffect(() => {
        writeAffinity(affinity)
      }, [affinity])

      // Re-enable the snack button when its cooldown ends.
      React.useEffect(() => {
        if (affinity.lastFedAt === 0) return undefined
        const remaining = FEED_COOLDOWN_MS - (Date.now() - affinity.lastFedAt)
        if (remaining <= 0) return undefined
        const timer = setTimeout(() => setFeedTick((value) => value + 1), remaining + 60)
        return () => clearTimeout(timer)
      }, [affinity.lastFedAt])

      // A new bond level gets a hop and a line, without pretending a run ended.
      React.useEffect(() => {
        const was = levelRef.current
        levelRef.current = level
        if (level <= was) return undefined
        const line = t('pet.levelUp', { level })
        lastSpeech.current = line
        setTurns((prev) => [...prev, { role: 'pet', text: line, ambient: true }].slice(-MAX_TURNS))
        setAnnounced(line)
        setHopId((value) => value + 1)
        triggerHop()
        return undefined
      }, [level, t, triggerHop])

      // She leans toward the pointer, but not while being dragged.
      React.useEffect(() => {
        draggingRef.current = dragging
      }, [dragging])

      React.useEffect(() => {
        if (typeof window === 'undefined') return undefined
        const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
        let frame = 0
        let pointerX = 0
        let pointerY = 0
        const apply = () => {
          frame = 0
          const node = buttonRef.current
          if (node === null) return
          if (draggingRef.current || motion?.matches === true) {
            node.style.transform = ''
            return
          }
          const rect = node.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return
          const centreX = rect.left + rect.width / 2
          const centreY = rect.top + rect.height * 0.6
          const dx = Math.max(-1, Math.min(1, (pointerX - centreX) / (rect.width * 1.7)))
          const dy = Math.max(-1, Math.min(1, (pointerY - centreY) / (rect.height * 1.7)))
          node.style.transform = `translate(${(dx * 3).toFixed(2)}px, ${(dy * 2).toFixed(2)}px) rotate(${(dx * 3.2).toFixed(2)}deg)`
        }
        const onMove = (event) => {
          pointerX = event.clientX
          pointerY = event.clientY
          if (frame === 0) frame = requestAnimationFrame(apply)
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        return () => {
          window.removeEventListener('pointermove', onMove)
          if (frame !== 0) cancelAnimationFrame(frame)
          const node = buttonRef.current
          if (node !== null) node.style.transform = ''
        }
      }, [])

      // Warn the bubble when it would run off the top of the viewport.
      React.useEffect(() => {
        if (collapsed) {
          setBubbleBelow(false)
          return undefined
        }
        const measure = () => {
          const root = rootRef.current
          const bubble = bubbleRef.current
          if (root === null || bubble === null) return
          const rect = root.getBoundingClientRect()
          setBubbleBelow(rect.top < bubble.offsetHeight + 16)
        }
        measure()
        const bubble = bubbleRef.current
        const observer = typeof ResizeObserver === 'function' && bubble !== null
          ? new ResizeObserver(measure)
          : undefined
        observer?.observe(bubble)
        window.addEventListener('resize', measure)
        return () => {
          observer?.disconnect()
          window.removeEventListener('resize', measure)
        }
      }, [collapsed, dragging])

      // Quiet self-talk while she is idle and her bubble is open. The balance
      // is read through a ref so polling cannot keep resetting the timer, and
      // each line re-arms the next one.
      React.useEffect(() => {
        if (collapsed || pending) return undefined
        if (kind !== undefined || running || celebrating) return undefined
        const delay = IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)
        const timer = setTimeout(() => {
          const pool = [t('idle.1'), t('idle.2'), t('idle.3')]
          if (lowBalance.current) pool.push(t('idle.poor'))
          const line = pickLine(pool, lastSpeech.current)
          if (line !== '') {
            lastSpeech.current = line
            setTurns((prev) => [...prev, { role: 'pet', text: line, ambient: true }].slice(-MAX_TURNS))
          }
          setSelfTalkTick((value) => value + 1)
        }, delay)
        return () => clearTimeout(timer)
      }, [collapsed, pending, kind, running, celebrating, t, selfTalkTick])

      const pushSpeech = (text, announce = false) => {
        if (text === '') return
        lastSpeech.current = text
        if (announce) setAnnounced(text)
        setTurns((prev) => [...prev, { role: 'pet', text, ambient: true }].slice(-MAX_TURNS))
      }

      const closeBubble = () => {
        writeCollapsed(true)
        setCollapsed(true)
        buttonRef.current?.focus?.()
      }

      const openBubble = () => {
        writeCollapsed(false)
        setCollapsed(false)
      }

      const pat = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const keyboard = event.detail === 0
        const x = keyboard || rect.width === 0 ? 0.5 : (event.clientX - rect.left) / rect.width
        const y = keyboard || rect.height === 0 ? 0.25 : (event.clientY - rect.top) / rect.height
        const zone = y < 0.45 ? 'head' : (y > 0.55 && x > 0.58 ? 'tail' : 'body')
        const line = pickLine([t('pat.' + zone + '.1'), t('pat.' + zone + '.2')], lastSpeech.current)
        pushSpeech(line, true)
        setAffinity((value) => ({
          ...value,
          points: Math.min(AFFINITY_CAP, value.points + PET_POINTS),
        }))
        triggerPat()
      }

      const canFeed = Date.now() - affinity.lastFedAt >= FEED_COOLDOWN_MS
      const feed = () => {
        if (!canFeed) {
          pushSpeech(t('pet.feedWait'), true)
          return
        }
        pushSpeech(pickLine([t('feed.1'), t('feed.2')], lastSpeech.current), true)
        setAffinity((value) => ({
          points: Math.min(AFFINITY_CAP, value.points + FEED_POINTS),
          lastFedAt: Date.now(),
        }))
        triggerEat()
      }

      const onPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        suppressClickUntil.current = 0
        const root = rootRef.current
        if (root === null) return
        const rect = root.getBoundingClientRect()
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          moved: false,
        }
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }

      const onPointerMove = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        if (!drag.moved) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
          drag.moved = true
          draggingRef.current = true
          setDragging(true)
          if (!collapsed) pushSpeech(t('drag.pick'), true)
        }
        setPosition(clampToViewport(drag.width, drag.height, drag.left + dx, drag.top + dy))
      }

      const endDrag = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        if (!drag.moved) return
        draggingRef.current = false
        setDragging(false)
        // The click that follows this release belongs to the drag, not to her.
        suppressClickUntil.current = Date.now() + SUPPRESS_CLICK_MS
        if (collapsed) return
        pushSpeech(t('drag.drop'), true)
      }

      const onClick = (event) => {
        if (Date.now() < suppressClickUntil.current) return
        // Clicks 2..n of a double-click belong to the reset gesture.
        if (event.detail > 1) return
        if (collapsed) {
          openBubble()
          return
        }
        pat(event)
      }

      const onKeyDown = (event) => {
        const step = event.shiftKey ? 24 : 8
        const delta = event.key === 'ArrowLeft'
          ? [-step, 0]
          : event.key === 'ArrowRight'
            ? [step, 0]
            : event.key === 'ArrowUp'
              ? [0, -step]
              : event.key === 'ArrowDown' ? [0, step] : null
        if (delta === null) return
        const root = rootRef.current
        if (root === null) return
        event.preventDefault()
        const rect = root.getBoundingClientRect()
        setPosition(clampToViewport(rect.width, rect.height, rect.left + delta[0], rect.top + delta[1]))
      }

      const pose = poseOf(kind, running, celebrating)
      const lines = describe(pose, kind, balance, t)
      const stateLabel = lines.main
      // Only real chat replies are announced; spontaneous chatter would pester
      // a screen reader every couple of minutes.
      const lastSpoken = turns.filter((turn) => turn.role === 'pet' && turn.ambient !== true).pop()
      const lastPetText = pending || lastSpoken === undefined ? '' : lastSpoken.text
      const liveText = lastPetText === '' ? stateLabel : stateLabel + ' — ' + lastPetText
      const rootStyle = position === null
        ? undefined
        : { left: position.x + 'px', top: position.y + 'px', right: 'auto', bottom: 'auto' }

      const appendToReply = (chunk) => setTurns((prev) => {
        // Find the open reply, which may no longer be the last turn: a pat or
        // a snack during the reply appends her comment after it.
        let index = -1
        for (let i = prev.length - 1; i >= 0; i -= 1) {
          if (prev[i].streaming === true) {
            index = i
            break
          }
        }
        if (index < 0) return prev
        const next = prev.slice()
        next[index] = { ...next[index], text: next[index].text + chunk }
        return next
      })

      const sendMessage = async () => {
        const text = draft.trim()
        if (text === '' || pending) return
        const history = turns
          .filter((turn) => turn.text !== '' && turn.ambient !== true)
          .slice(-8)
          .map((turn) => ({ role: turn.role === 'user' ? 'user' : 'assistant', text: turn.text }))
        setDraft('')
        setPending(true)
        setTurns((prev) => [...prev, { role: 'user', text }, { role: 'pet', text: '', streaming: true }].slice(-MAX_TURNS))
        let received = ''
        try {
          const response = await fetch(CHAT_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              text,
              history,
              state: pose,
              balance: balanceText(balance, t),
              locale: getLocale(),
            }),
          })
          if (!response.ok || response.body === null) throw new Error('chat unavailable')
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            if (chunk === '') continue
            received += chunk
            appendToReply(chunk)
          }
          const rest = decoder.decode()
          if (rest !== '') {
            received += rest
            appendToReply(rest)
          }
          if (received.trim() === '') appendToReply(t('chat.offline'))
        } catch {
          appendToReply(received.trim() === '' ? t('chat.offline') : '…')
        } finally {
          setPending(false)
          setTurns((prev) => {
            let changed = false
            const next = prev.map((turn) => {
              if (turn.streaming !== true) return turn
              changed = true
              return { ...turn, streaming: false }
            })
            return changed ? next : prev
          })
        }
      }

      const submitMessage = (event) => {
        event.preventDefault()
        void sendMessage()
      }

      return h('div', {
        ref: rootRef,
        className: 'whale-pet',
        'data-state': pose,
        'data-dragging': dragging ? 'true' : undefined,
        'data-pat': patting ? 'true' : undefined,
        'data-eat': eating ? 'true' : undefined,
        'data-hop': hopping ? 'true' : undefined,
        'data-bubble-below': bubbleBelow ? 'true' : undefined,
        style: rootStyle,
        onKeyDown: (event) => {
          if (event.key === 'Escape' && !collapsed) closeBubble()
        },
      },
        collapsed ? null : h('div', {
          ref: bubbleRef,
          className: 'whale-pet__bubble',
          id: 'whale-pet-bubble',
        },
        h('div', { className: 'whale-pet__line' },
          h('span', { className: 'whale-pet__dot', 'aria-hidden': true }),
          h('span', { className: 'whale-pet__main' }, lines.main),
          h('button', {
            type: 'button',
            className: 'whale-pet__action',
            onClick: feed,
            'aria-disabled': canFeed ? undefined : 'true',
            'aria-label': t('pet.feed'),
            title: canFeed ? t('pet.feed') : t('pet.feedWait'),
          }, h('svg', {
            viewBox: '0 0 16 16',
            fill: 'currentColor',
            'aria-hidden': true,
            focusable: 'false',
          },
          h('path', { d: 'M3.7 7.6h8.6l-1 5.2a1.1 1.1 0 0 1-1.1.9H5.8a1.1 1.1 0 0 1-1.1-.9z' }),
          h('path', { d: 'M3.1 5.8a4.9 4.9 0 0 1 9.8 0v.9H3.1z' }),
          h('circle', { cx: '8', cy: '1.7', r: '1.2' }),
          )),
          h('button', {
            type: 'button',
            className: 'whale-pet__action',
            onClick: closeBubble,
            'aria-label': t('pet.close'),
            title: t('pet.close'),
          }, h('svg', {
            viewBox: '0 0 16 16',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.7',
            'stroke-linecap': 'round',
            'aria-hidden': true,
            focusable: 'false',
          },
          h('path', { d: 'M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2' }),
          )),
        ),
        lines.detail === '' ? null : h('div', { className: 'whale-pet__detail' },
          lines.detail + ' · ' + t('pet.level', { level: level })),
        turns.length === 0 ? null : h('div', {
          className: 'whale-pet__chat',
          ref: chatRef,
          'aria-live': 'off',
        },
          turns.map((turn, index) => h('div', {
            key: index,
            className: 'whale-pet__turn',
            'data-role': turn.role === 'user' ? 'user' : 'pet',
            'data-pending': turn.streaming === true && pending ? 'true' : undefined,
          }, turn.text === '' ? '…' : turn.text)),
        ),
        h('form', { className: 'whale-pet__composer', onSubmit: submitMessage },
          h('input', {
            ref: inputRef,
            className: 'whale-pet__input',
            type: 'text',
            value: draft,
            placeholder: t('chat.placeholder'),
            'aria-label': t('chat.placeholder'),
            maxLength: 200,
            autoComplete: 'off',
            onChange: (event) => setDraft(event.target.value),
          }),
          h('button', {
            type: 'submit',
            className: 'whale-pet__send',
            disabled: pending || draft.trim() === '',
            'aria-label': t('chat.send'),
            title: t('chat.send'),
          }, pending ? '…' : '↑'),
        ),
        h('div', { className: 'whale-pet__sr', 'aria-live': 'polite' }, liveText),
        h('div', { className: 'whale-pet__sr', 'aria-live': 'polite' }, announced),
        ),
        h('div', { className: 'whale-pet__stage' },
          h('button', {
            type: 'button',
            ref: buttonRef,
            className: 'whale-pet__button',
            onClick,
            onPointerDown,
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
            onLostPointerCapture: endDrag,
            onKeyDown,
            onDoubleClick: () => setPosition(null),
            'aria-label': t('pet.label') + ' — ' + stateLabel + ' — '
              + t('pet.level', { level: level }) + ' — '
              + (collapsed ? t('pet.toggleShow') : t('pet.patHint')),
            title: stateLabel + ' · ' + t('pet.level', { level: level }) + ' · '
              + (collapsed ? t('pet.toggleShow') : t('pet.patHint')),
          },
          h('img', {
            key: pose + ':' + hopId,
            className: 'whale-pet__image',
            src: ASSET_BASE + POSE_FILES[pose],
            alt: '',
            draggable: false,
            decoding: 'async',
          }),
          ),
          pose === 'waiting'
            ? h('span', { className: 'whale-pet__badge', 'aria-hidden': true }, '!')
            : null,
        ),
        h('style', null, CSS),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'whale-pet: dictionaries')
      const hub = createBalanceHub()

      // Optional: the pet renders without the account services, just without
      // a balance line.
      const balanceWiring = ctx.inject(
        ['remote', 'remote.account', 'accountUi', 'remoteAccess'],
        (scope) => {
          let granted = false
          let reading = false
          const publish = (phase, wallets = [], bonusWallets = []) => {
            hub.publish({ phase, wallets, bonusWallets, updatedAt: Date.now() })
          }
          const read = async () => {
            if (reading) return
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
            const current = hub.getSnapshot()
            if (current.phase === 'ready' && Date.now() - current.updatedAt < BALANCE_MIN_GAP_MS) return
            reading = true
            try {
              const result = await scope.remote.account.getBalance(
                scope.accountUi.clientMetadata(scope.locale.getSnapshot().active),
              )
              if (!result.ok) {
                publish('error')
                return
              }
              const value = result.value
              if (value === null) {
                publish('signed-out')
                return
              }
              if (value.status === 'failed') {
                publish('error')
                return
              }
              publish('ready', value.value, value.bonusWallets)
            } catch (error) {
              console.error('[whale-pet] balance read failed', error)
              publish('error')
            } finally {
              reading = false
            }
          }
          // Only the granted peer reads; the Host enforces the same rule.
          hub.refresh = () => {
            if (granted) void read()
          }
          scope.effect(
            () => scope.remoteAccess.whenAccess('account/getBalance', () => {
              granted = true
              hub.refresh()
              const tick = () => {
                hub.refresh()
              }
              const timer = setInterval(tick, BALANCE_POLL_MS)
              const onVisibility = () => {
                if (typeof document === 'undefined' || document.visibilityState === 'visible') tick()
              }
              if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
              return () => {
                granted = false
                clearInterval(timer)
                if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
                // Do not keep showing a balance this peer may no longer read.
                if (hub.getSnapshot().phase === 'ready') publish('error')
              }
            }),
            'whale-pet: balance access',
          )
        },
      )
      ctx.effect(() => () => {
        if (typeof balanceWiring?.dispose === 'function') balanceWiring.dispose()
      }, 'whale-pet: balance source lifetime')

      // A pet whose balance never resolves (no account service, or no access
      // grant on this peer) must say so instead of loading forever.
      ctx.effect(() => {
        const timer = setTimeout(() => {
          if (hub.getSnapshot().phase === 'idle') hub.publish({
            phase: 'error',
            wallets: [],
            bonusWallets: [],
            updatedAt: Date.now(),
          })
        }, BALANCE_GRACE_MS)
        return () => clearTimeout(timer)
      }, 'whale-pet: balance grace period')

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'whale-pet',
        // Negative order paints her below the shipped overlay entries, so
        // context menus, toasts, and pickers stay on top.
        order: -100,
        locale: NS,
        inject: () => ({ balanceHub: hub, getLocale: () => ctx.locale.getSnapshot().active }),
      }, WhalePet))
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
