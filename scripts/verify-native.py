import json, re, sys
from pathlib import Path
out = Path(sys.argv[1])
def events(path):
    return [dict(json.JSONDecoder().raw_decode(line.split('[EightAgain] ', 1)[1])[0],
                 pid=int(re.search(r'eightagain\[(\d+)\]', line).group(1)))
            for line in path.read_text().splitlines()
            if '[EightAgain] {' in line]
before = events(out / 'before-restart.log')
after = events(out / 'native.log')
saved_event = [e for e in before if e['event'] == 'practice-paused' and e.get('reason') == 'back'][-1]
saved = {key: saved_event[key] for key in ('clip', 'speed', 'rounds')}
assert saved['clip'] == 1 and saved['speed'] == 1 and saved['rounds'] == [1, 0, 0], saved
restored = [e for e in after if e['event'] == 'playing' and e['pid'] != saved_event['pid']][0]
assert restored['wallMs'] > before[-1]['wallMs'], restored
for key in ('clip', 'speed', 'rounds'):
    assert restored[key] == saved[key], (key, saved, restored)
assert 48 <= restored['contentTime'] < 60, restored
assert restored['running'] and not restored['paused'], restored
(out / 'progress-check.json').write_text(json.dumps({'before_close': saved, 'restored': restored}, indent=2) + '\n')
print('Cross-process section, speed, round count and media position: PASS')
voice = [e for e in after if e['event'] == 'cue-requested']
completed = [e for e in after if e['event'] == 'cue-ended' and e.get('cue')]
assert {'watch', 'ready', 'practice', 'complete'} <= {e['cue'] for e in voice}, voice
assert {'watch', 'ready', 'practice', 'complete'} <= {e['cue'] for e in completed}, completed
assert all(e['running'] or e['phase'] == 'complete' for e in voice), voice
errors = [e for e in after if e['event'] == 'cue-error']
assert not errors, errors
paused = next(e for e in before if e['event'] == 'practice-paused' and e['phase'] == 'countdown')
resumed = next(e for e in before if e['event'] in ('cue-requested', 'practice-resumed')
               and e['wallMs'] > paused['wallMs'] and e['phase'] == 'countdown' and e['running'])
assert not [e for e in voice if paused['wallMs'] < e['wallMs'] < resumed['wallMs']], voice
assert any(e['cue'] == 'ready' and e['wallMs'] > resumed['wallMs'] and e['phase'] == 'countdown'
           for e in completed), completed
(out / 'voice-check.json').write_text(json.dumps({'requested': voice, 'completed': completed,
    'countdown_pause': paused, 'countdown_resume': resumed, 'errors': errors}, indent=2) + '\n')
print('Four native voice cues, paused interval and completed routine: PASS')
