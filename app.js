(() => {
  'use strict';
  const STORAGE_KEY = 'nitti.ai-tool-memo.v1';
  const GUIDE_KEY = 'nitti.ai-tool-memo.guide.v1';
  const initial = [
    { id: 'initial-alpha', name: 'Alpha', monthly: 3000, memo: '文章' },
    { id: 'initial-beta', name: 'Beta', monthly: 0, memo: '調査' },
    { id: 'initial-gamma', name: 'Gamma', monthly: 5000, memo: '画像' }
  ];
  const $ = id => document.getElementById(id);
  const normalize = text => text.normalize('NFKC').trim().toLocaleLowerCase('ja');
  const cloneInitial = () => initial.map(tool => ({ ...tool }));
  let tools = [], editingId = null, storageBlocked = false;
  const warning = message => { $('storage-warning').textContent = message; $('storage-warning').hidden = false; };
  const status = message => { $('status').textContent = message; };
  function validStored(value) {
    if (!Array.isArray(value)) return false;
    const ids = new Set(), names = new Set();
    return value.every(t => {
      if (!t || typeof t.id !== 'string' || !t.id || ids.has(t.id) || typeof t.name !== 'string' || !t.name.trim() || t.name.length > 100 || !normalize(t.name) || names.has(normalize(t.name)) || !Number.isSafeInteger(t.monthly) || t.monthly < 0 || t.monthly > 999999999 || typeof t.memo !== 'string' || t.memo.length > 2000) return false;
      ids.add(t.id); names.add(normalize(t.name)); return true;
    });
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) tools = cloneInitial();
      else { const value = JSON.parse(raw); if (!validStored(value)) throw new Error('invalid'); tools = value.map(t => ({id:t.id,name:t.name,monthly:t.monthly,memo:t.memo})); }
    } catch {
      tools = cloneInitial(); storageBlocked = true;
      warning('保存データを読み込めませんでした。初期データを一時表示しています。既存の保存内容は上書きしません。「初期状態に戻す」で保存を再開できます。');
    }
  }
  function persist() {
    if (storageBlocked) { warning('現在の変更は一時的なものです。保存を再開するには「初期状態に戻す」を選んでください。必要なデータはCSVで保管できます。'); return false; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tools)); $('storage-warning').hidden = true; return true; }
    catch { warning('ブラウザーに保存できませんでした。変更はこの画面だけに反映されています。CSVで保管してください。'); return false; }
  }
  function finishEdit() {
    editingId = null; $('tool-form').reset(); $('form-title').textContent = 'ツールを追加'; $('save-button').textContent = '追加する'; $('cancel-button').hidden = true; $('form-error').textContent = '';
  }
  function startEdit(id) {
    const t = tools.find(item => item.id === id); if (!t) return;
    editingId = id; $('tool-name').value = t.name; $('tool-monthly').value = t.monthly; $('tool-memo').value = t.memo;
    $('form-title').textContent = 'ツールを編集'; $('save-button').textContent = '変更を保存'; $('cancel-button').hidden = false; $('form-error').textContent = ''; $('tool-name').focus(); status('編集中です。キャンセルすると変更を破棄します。');
  }
  function render() {
    const query = normalize($('search').value);
    let shown = tools.filter(t => normalize(t.name).includes(query) || normalize(t.memo).includes(query));
    const direction = $('sort').value;
    if (direction !== 'original') shown = [...shown].sort((a,b) => direction === 'asc' ? a.monthly-b.monthly : b.monthly-a.monthly);
    $('count').textContent = `${shown.length} / ${tools.length}件`;
    $('tool-list').replaceChildren();
    for (const t of shown) {
      const li = document.createElement('li'); li.className = 'tool-card'; li.dataset.id = t.id;
      const head = document.createElement('div'); head.className = 'card-heading';
      const name = document.createElement('h3'); name.textContent = t.name;
      const price = document.createElement('div'); price.className = 'price'; price.textContent = `¥${t.monthly.toLocaleString('ja-JP')}`;
      const unit = document.createElement('small'); unit.textContent = '/ 月'; price.append(unit); head.append(name,price);
      const memo = document.createElement('p'); memo.className = 'memo'; memo.textContent = t.memo || 'メモはありません';
      const actions = document.createElement('div'); actions.className = 'actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '編集'; edit.setAttribute('aria-label', `${t.name}を編集`); edit.addEventListener('click', () => startEdit(t.id));
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = '削除'; remove.setAttribute('aria-label', `${t.name}を削除`);
      remove.addEventListener('click', () => { if (!confirm(`「${t.name}」を削除しますか？`)) return; tools = tools.filter(item => item.id !== t.id); if (editingId === t.id) finishEdit(); const saved = persist(); render(); status(saved ? '削除して保存しました。' : '削除しました（未保存）。'); });
      actions.append(edit,remove); li.append(head,memo,actions); $('tool-list').append(li);
    }
    $('empty').hidden = shown.length !== 0; $('empty').textContent = tools.length ? '一致するツールがありません。検索語を変えてみてください。' : 'まだツールがありません。フォームから追加できます。';
  }
  $('tool-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('tool-name').value.trim(), amount = $('tool-monthly').value.trim(), memo = $('tool-memo').value;
    let error = '', field = 'tool-name';
    if (!name || !normalize(name)) error = 'ツール名を入力してください。';
    else if (name.length > 100) error = 'ツール名は100文字以内で入力してください。';
    else if (!/^[0-9]+$/.test(amount) || !Number.isSafeInteger(Number(amount)) || Number(amount) > 999999999) { error = '月額料金は0〜999,999,999の半角整数で入力してください。'; field = 'tool-monthly'; }
    else if (memo.length > 2000) { error = 'メモは2,000文字以内で入力してください。'; field = 'tool-memo'; }
    else if (tools.some(t => t.id !== editingId && normalize(t.name) === normalize(name))) error = '同じ名前のツールが登録されています。';
    if (error) { $('form-error').textContent = error; $(field).focus(); return; }
    if (editingId) tools = tools.map(t => t.id === editingId ? { ...t, name, monthly:Number(amount), memo } : t);
    else tools.push({id: globalThis.crypto?.randomUUID?.() || `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`, name, monthly:Number(amount), memo});
    const edited = editingId !== null, saved = persist(); finishEdit(); render(); status(`${edited ? '変更' : '追加'}しました${saved ? '。ブラウザーに保存済みです。' : '（未保存）。'}`);
  });
  $('cancel-button').addEventListener('click', () => {finishEdit(); status('編集をキャンセルしました。');});
  $('search').addEventListener('input',render); $('sort').addEventListener('change',render);
  $('reset').addEventListener('click', () => {
    if (!confirm('保存した全ツールを削除し、Alpha・Beta・Gammaの初期状態に戻しますか？編集中の内容も破棄されます。')) return;
    tools = cloneInitial(); storageBlocked = false; const saved = persist(); finishEdit(); $('search').value = ''; $('sort').value = 'original'; render(); status(saved ? '初期状態に戻して保存しました。' : '初期状態に戻しました（未保存）。');
  });
  function csvCell(value) {
    let text = String(value);
    // Spreadsheet formulas can start after whitespace/control characters.
    if (/^[\s\u0000-\u0020]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }
  $('export').addEventListener('click', () => {
    const rows = [['ツール名','月額料金（円）','メモ'], ...tools.map(t => [t.name,t.monthly,t.memo])];
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = 'ai-tool-memo.csv'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); status(`${tools.length}件のCSVをダウンロードしました。`);
  });
  // Guide completion is separate from tool data. Reset only touches STORAGE_KEY.
  // sessionStorage is a fallback when persistent storage is unavailable.
  let guideDismissed = false;
  function guideAlreadySeen() {
    if (guideDismissed) return true;
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try { if (globalThis[storageName].getItem(GUIDE_KEY) === 'seen') return true; } catch { /* Storage can be disabled. */ }
    }
    return false;
  }
  function closeGuide() {
    guideDismissed = true;
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try { globalThis[storageName].setItem(GUIDE_KEY, 'seen'); } catch { /* Memory flag still prevents reopening in this page. */ }
    }
    $('first-guide').hidden = true;
    $('tool-name').focus({ preventScroll: true });
  }
  $('guide-next').addEventListener('click', () => {
    $('guide-progress').textContent = 'はじめての使い方 · 2 / 2';
    $('guide-title').textContent = 'リストから比べてみましょう';
    $('guide-message').textContent = '登録したツールは、料金順に並べ替えたり、名前やコメントの一部で検索したりできますよ ☺️';
    $('guide-next').hidden = true;
    $('guide-close').focus({ preventScroll: true });
  });
  $('guide-close').addEventListener('click', closeGuide);
  $('first-guide').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeGuide(); }
  });
  load(); render();
  if (!guideAlreadySeen()) $('first-guide').hidden = false;
})();
