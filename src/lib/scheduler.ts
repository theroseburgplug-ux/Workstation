import { differenceInMinutes, addMinutes, format } from 'date-fns';

type TaskSnapshot = {
  id: string;
  title: string;
  dueDate?: string;
  clientName?: string;
  type?: string;
  durationMs?: number | null;
};

type Meeting = { id: string; title: string; start: string; end: string };

export type DayBlock = {
  start: string; // HH:mm
  end: string; // HH:mm
  type: 'meeting' | 'focus' | 'admin' | 'break' | 'travel';
  title: string;
  linkedTaskId?: string | null;
  notes?: string;
};

export type DaySchedule = {
  daySchedule: DayBlock[];
  nextBlockTaskId?: string | null;
  rationale: string;
};

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hhmmToMinutes(hhmm: string) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
}

function estimateDurationMinutes(task: TaskSnapshot) {
  if (task.durationMs && typeof task.durationMs === 'number') return Math.round(task.durationMs / 60000);
  const t = (task.type || '').toLowerCase();
  if (t.includes('design') || t.includes('photo') || t.includes('layout')) return 75;
  if (t.includes('admin') || t.includes('email') || t.includes('invoice')) return 20;
  if (t.includes('shoot') || t.includes('prep')) return 45;
  if (t.includes('edit') || t.includes('post')) return 120;
  if (t.includes('video') || t.includes('edit')) return 120;
  return 45; // default
}

export function buildDeterministicSchedule(opts: {
  date: string; // YYYY-MM-DD
  nowISO: string;
  meetings?: Meeting[];
  top3?: TaskSnapshot[];
  dueToday?: TaskSnapshot[];
  includeDueTasks?: boolean;
  workStart?: string; // HH:mm
  workEnd?: string; // HH:mm
  focusLength?: number; // minutes
  breakLength?: number; // minutes
  breakPattern?: 'every' | 'none' | 'single';
  singleBreakAt?: string; // HH:mm
  singleBreakLength?: number; // minutes
  preferMorning?: boolean;
  bufferBetweenMeetings?: number; // minutes
  maxBlocks?: number;
}): DaySchedule {
  const {
    nowISO,
    meetings = [],
    top3 = [],
    dueToday = [],
    includeDueTasks = true,
    workStart = '09:00',
    workEnd = '18:00',
    focusLength = 45,
    breakLength = 10,
    breakPattern = 'every',
    singleBreakAt,
    singleBreakLength = 30,
    preferMorning = true,
    bufferBetweenMeetings = 10,
    maxBlocks = 30,
  } = opts;

  const now = new Date(nowISO);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Build timeline in minutes from midnight
  const dayStart = Math.max(hhmmToMinutes(workStart), nowMinutes);
  const dayEnd = hhmmToMinutes(workEnd);
  let cursor = dayStart;

  // Convert meetings to minute ranges and sort
  const fixedMeetings = meetings.map(m => ({ ...m, startMin: hhmmToMinutes(m.start), endMin: hhmmToMinutes(m.end) })).sort((a,b) => a.startMin - b.startMin);

  const blocks: DayBlock[] = [];

  // track which task ids we've already scheduled to avoid duplicates
  const scheduledIds = new Set<string>();

  // Helper to push break if space
  const pushBreakIfSpace = () => {
    if (breakPattern !== 'every') return; // only insert routine breaks when pattern is 'every'
    if (cursor + breakLength <= dayEnd) {
      const s = minutesToHHMM(cursor);
      const e = minutesToHHMM(cursor + breakLength);
      blocks.push({ start: s, end: e, type: 'break', title: 'Break' });
      cursor += breakLength;
    }
  };

  // single-break tracking
  let singleBreakUsed = false;
  const singleBreakAtMin = singleBreakAt ? hhmmToMinutes(singleBreakAt) : Math.floor((dayStart + dayEnd) / 2);

  // Walk through day, inserting meetings and filling focus/admin blocks
  // Create a queue prioritized: top3 first, then dueToday
  const queue: TaskSnapshot[] = [];
  top3.forEach(t => queue.push(t));
  if (includeDueTasks) dueToday.forEach(t => { if (!queue.find(q => q.id === t.id)) queue.push(t); });

  let qIndex = 0;

  // iterate over timeline, accounting for meetings
  let meetingIndex = 0;
  while (cursor < dayEnd && blocks.length < maxBlocks) {
    const nextMeeting = fixedMeetings[meetingIndex];
    if (nextMeeting && nextMeeting.startMin - bufferBetweenMeetings <= cursor) {
      // if meeting starts now or overlaps, push meeting block
      const s = Math.max(cursor, nextMeeting.startMin);
      // advance cursor to meeting end
      if (cursor < nextMeeting.startMin) {
        // small focus before meeting
        const avail = nextMeeting.startMin - cursor - bufferBetweenMeetings;
        if (avail >= Math.min(20, focusLength)) {
          // push one focus
          const dur = Math.min(focusLength, avail);
          const sb = minutesToHHMM(cursor);
          const eb = minutesToHHMM(cursor + dur);
          const task = queue[qIndex];
          if (task) {
            blocks.push({ start: sb, end: eb, type: 'focus', title: task.title, linkedTaskId: task.id });
            qIndex++;
          } else {
            // Replace admin blocks with a generic open-work focus block
            blocks.push({ start: sb, end: eb, type: 'focus', title: 'Open Work' });
          }
          cursor += dur;
          // break if space
          pushBreakIfSpace();
        } else {
          cursor = nextMeeting.startMin - bufferBetweenMeetings;
        }
      }
      // push meeting exactly
      const ms = minutesToHHMM(nextMeeting.startMin);
      const me = minutesToHHMM(nextMeeting.endMin);
      blocks.push({ start: ms, end: me, type: 'meeting', title: nextMeeting.title });
      cursor = nextMeeting.endMin + bufferBetweenMeetings;
      meetingIndex++;
      continue;
    }

    // No immediate meeting: take next queued task
    let task = queue[qIndex];
    // advance qIndex past any already-scheduled tasks
    while (task && task.id && scheduledIds.has(task.id)) {
      qIndex++;
      task = queue[qIndex];
    }
    if (task) {
      // guard again for schedule end
      const dur = Math.min(focusLength, Math.max(15, estimateDurationMinutes(task)));
      if (cursor + dur > dayEnd) break;
      const s = minutesToHHMM(cursor);
      const e = minutesToHHMM(cursor + dur);
      // Only schedule if not already scheduled
      if (!task.id || !scheduledIds.has(task.id)) {
        blocks.push({ start: s, end: e, type: 'focus', title: task.title, linkedTaskId: task.id });
        if (task.id) scheduledIds.add(task.id);
        cursor += dur;
        // After completing a block, decide about breaks according to pattern
        if (breakPattern === 'single' && !singleBreakUsed && cursor >= singleBreakAtMin) {
          // insert one longer break at the requested time
          const brStart = Math.max(singleBreakAtMin, cursor - dur);
          const s = minutesToHHMM(brStart);
          const e = minutesToHHMM(Math.min(dayEnd, brStart + singleBreakLength));
          blocks.push({ start: s, end: e, type: 'break', title: 'Break' });
          cursor = Math.min(dayEnd, brStart + singleBreakLength);
          singleBreakUsed = true;
        } else {
          pushBreakIfSpace();
        }
      }
      qIndex++;
      continue;
    }

    // Nothing queued: fill with generic open-work focus blocks
    if (cursor + focusLength > dayEnd) break;
    const s = minutesToHHMM(cursor);
    const e = minutesToHHMM(cursor + focusLength);
    blocks.push({ start: s, end: e, type: 'focus', title: 'Open Work' });
    cursor += focusLength;
    if (breakPattern === 'single' && !singleBreakUsed && cursor >= singleBreakAtMin) {
      const brStart = Math.max(singleBreakAtMin, cursor - focusLength);
      const s = minutesToHHMM(brStart);
      const e = minutesToHHMM(Math.min(dayEnd, brStart + singleBreakLength));
      blocks.push({ start: s, end: e, type: 'break', title: 'Break' });
      cursor = Math.min(dayEnd, brStart + singleBreakLength);
      singleBreakUsed = true;
    } else {
      pushBreakIfSpace();
    }
  }

  const nextBlock = blocks.find(b => hhmmToMinutes(b.start) >= nowMinutes && b.type !== 'break' && b.type !== 'meeting');

  const rationale = `Schedule generated deterministically. Priorities: meetings preserved, then Top 3, then due tasks, then open work. Break pattern: ${breakPattern}${breakPattern === 'every' ? ` (short breaks ${breakLength}m)` : breakPattern === 'single' ? ` (one break ${singleBreakLength}m at ${singleBreakAt || minutesToHHMM(singleBreakAtMin)})` : ' (no breaks)'}.`;

  return {
    daySchedule: blocks,
    nextBlockTaskId: nextBlock?.linkedTaskId || null,
    rationale,
  };
}

export function buildAIRequestPayload(snapshot: any) {
  return `Generate a JSON schedule for the day in the following format (only return valid JSON object): {"daySchedule": [{"start":"HH:MM","end":"HH:MM","type":"focus|meeting|break|admin","title":"...","linkedTaskId":"...","notes":"..."}], "nextBlockTaskId":"...", "rationale":"..."}. Preserve meetings exactly. Use Top 3 first, then overdue/due-today, include breaks, and use estimated durations in minutes when duration unknown. Here is the snapshot:\n${JSON.stringify(snapshot)}`;
}
