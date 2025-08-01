// JSZipのCDNを使う前提（index.htmlでCDN追加推奨）
// 画像選択時に本文入力欄を動的生成
// zip作成時にmemo_data.json, category_data.json, tag_data.json, version.json, images/を生成

// UUID生成用
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createMemoBlock(idx) {
  const div = document.createElement('div');
  div.className = 'memo-block';
  div.innerHTML = `
    <textarea class="memo-content"></textarea>
    <div class="memo-content-spacer"></div>
    <input type="file" class="memo-images" accept="image/*" multiple>
    <div class="thumbnails"></div>
    <span class="remove-memo-link">このメモを削除</span>
  `;
  // サムネイル表示
  const fileInput = div.querySelector('.memo-images');
  const thumbnailsDiv = div.querySelector('.thumbnails');
  fileInput.addEventListener('change', function(e) {
    thumbnailsDiv.innerHTML = '';
    Array.from(fileInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(ev) {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.alt = file.name;
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.display = 'inline-block';
        img.style.margin = '0.25em';
        thumbnailsDiv.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
  // 削除リンク
  div.querySelector('.remove-memo-link').addEventListener('click', function() {
    div.remove();
  });
  return div;
}

// 最初に1つメモを追加
const memoList = document.getElementById('memo-list');
memoList.appendChild(createMemoBlock(0));

document.getElementById('add-memo-btn').addEventListener('click', function() {
  memoList.appendChild(createMemoBlock(memoList.children.length));
});

document.getElementById('create-zip-btn').addEventListener('click', async function() {
  const memoBlocks = document.querySelectorAll('.memo-block');
  if (memoBlocks.length === 0) {
    alert('メモを1つ以上追加してください');
    return;
  }
  const now = new Date();
  const nowStr = now.toISOString();
  const memos = [];
  const allImages = [];
  for (let i = 0; i < memoBlocks.length; i++) {
    const block = memoBlocks[i];
    const content = block.querySelector('.memo-content').value;
    const fileInput = block.querySelector('.memo-images');
    const files = Array.from(fileInput.files);
    if (files.length === 0 && !content.trim()) continue; // 空メモはスキップ
    const imagePaths = files.map(f => `images/${f.name}`);
    memos.push({
      id: uuidv4(),
      title: '',
      content: content,
      tagIds: [],
      imagePaths: imagePaths,
      createdAt: nowStr,
      updatedAt: nowStr,
      sortOrder: 0,
      extraNote: '',
      categoryId: 'import'
    });
    allImages.push(...files);
  }
  if (memos.length === 0) {
    alert('本文または画像が入力されたメモを1つ以上追加してください');
    return;
  }
  // category_data.json
  const category = [{
    id: 'import',
    name: 'インポート',
    colorHex: null,
    sortOrder: 0,
    lastEditedAt: nowStr,
    showDateInList: false
  }];
  // tag_data.json
  const tags = [];
  // version.json
  const version = { dataVersion: 1 };

  // JSZipでzip生成
  const zip = new JSZip();
  zip.file('memo_data.json', JSON.stringify(memos, null, 2));
  zip.file('category_data.json', JSON.stringify(category, null, 2));
  zip.file('tag_data.json', JSON.stringify(tags, null, 2));
  zip.file('version.json', JSON.stringify(version, null, 2));
  const imagesFolder = zip.folder('images');
  // 重複画像名は1つだけ入れる
  const addedNames = new Set();
  for (let i = 0; i < allImages.length; i++) {
    const file = allImages[i];
    if (addedNames.has(file.name)) continue;
    const arrayBuffer = await file.arrayBuffer();
    imagesFolder.file(file.name, arrayBuffer);
    addedNames.add(file.name);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';
  const link = document.createElement('a');
  link.href = url;
  link.download = `web_memo_import_${nowStr.replace(/[:.]/g, '-')}.zip`;
  link.textContent = 'zipファイルをダウンロード・共有';
  link.style.display = 'inline-block';
  link.style.margin = '1em 0';
  link.style.fontSize = '1.1em';
  link.style.textDecoration = 'underline';
  link.style.color = '#111';
  resultDiv.appendChild(link);
});

// タブ切り替え
const tabBtns = document.querySelectorAll('.tab-btn');
const tabSections = document.querySelectorAll('.tab-section');
tabBtns.forEach(btn => {
  btn.addEventListener('click', function() {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabSections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// 画像一括タブの処理
const bulkImageInput = document.getElementById('bulk-image-input');
const bulkThumbnails = document.getElementById('bulk-thumbnails');
bulkImageInput.addEventListener('change', function(e) {
  bulkThumbnails.innerHTML = '';
  Array.from(bulkImageInput.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.alt = file.name;
      bulkThumbnails.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});
document.getElementById('bulk-create-zip-btn').addEventListener('click', async function() {
  const files = Array.from(bulkImageInput.files);
  if (files.length === 0) {
    alert('画像を選択してください');
    return;
  }
  const now = new Date();
  const nowStr = now.toISOString();
  const memos = files.map(file => ({
    id: uuidv4(),
    title: '',
    content: '',
    tagIds: [],
    imagePaths: [`images/${file.name}`],
    createdAt: nowStr,
    updatedAt: nowStr,
    sortOrder: 0,
    extraNote: '',
    categoryId: 'import'
  }));
  const category = [{
    id: 'import',
    name: 'インポート',
    colorHex: null,
    sortOrder: 0,
    lastEditedAt: nowStr,
    showDateInList: false
  }];
  const tags = [];
  const version = { dataVersion: 1 };
  const zip = new JSZip();
  zip.file('memo_data.json', JSON.stringify(memos, null, 2));
  zip.file('category_data.json', JSON.stringify(category, null, 2));
  zip.file('tag_data.json', JSON.stringify(tags, null, 2));
  zip.file('version.json', JSON.stringify(version, null, 2));
  const imagesFolder = zip.folder('images');
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    imagesFolder.file(file.name, arrayBuffer);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const resultDiv = document.getElementById('bulk-result');
  resultDiv.innerHTML = '';
  const link = document.createElement('a');
  link.href = url;
  link.download = `web_memo_import_${nowStr.replace(/[:.]/g, '-')}.zip`;
  link.textContent = 'zipファイルをダウンロード・共有';
  link.style.display = 'inline-block';
  link.style.margin = '1em 0';
  link.style.fontSize = '1.1em';
  link.style.textDecoration = 'underline';
  link.style.color = '#111';
  resultDiv.appendChild(link);
}); 