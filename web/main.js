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
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `memo_import_${nowStr.replace(/[:.]/g, '-')}.zip`;
  a.click();
  document.getElementById('result').textContent = 'zipファイルを作成しました！';
}); 
