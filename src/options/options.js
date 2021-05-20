const bannedWordsContainer = document.getElementById('words')
const newWordInput = document.getElementById('new-word')
const newWordForm = document.getElementById('new-word-form')

const importButton = document.getElementById('import')
const exportButton = document.getElementById('export')
const fileInput = document.getElementById('file-input')

const openOptionsButton = document.getElementById('open-options')

const isPopup = !importButton || !exportButton || !fileInput

if (openOptionsButton) openOptionsButton.addEventListener('click', () => chrome.runtime.openOptionsPage())

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

if (!isPopup) {
  importButton.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const contents = e.target.result
      const subs = contents.split('\n').map(sub => sub.trim()).filter(sub => sub.length > 0)
      chrome.storage.sync.get({ bannedWords: [] }, items => {
        const exists = items.bannedWords.length > 0
        let yes = true
        if (exists) {
          yes = window.confirm('This will overwrite all your current subreddits. Continue?')
        }
  
        if (!yes) return
  
        chrome.storage.sync.set({
          bannedWords: subs.map(word => 'r/' + word.toLowerCase().replaceAll('r/', ''))
        })
      })
    }
    reader.readAsText(file)
  })

  exportButton.addEventListener('click', () => {
    chrome.storage.sync.get({ bannedWords: [] }, items => {
      const exists = items.bannedWords.length > 0
      if (!exists) return
      const filename = `hazmat-export-subreddits-${new Date().toISOString()}.txt`
      const text = items.bannedWords.join('\n') + '\n'
      download(filename, text)
    })
  })
}

newWordForm.addEventListener('submit', e => {
  e.preventDefault();
  addWord(newWordInput.value)
  newWordInput.value = null
  return false;
})

chrome.storage.onChanged.addListener(render)
render()

function render () {
  chrome.storage.sync.get({
    bannedWords: []
  }, items => {
    if (!items) return
    bannedWordsContainer.innerHTML = items.bannedWords.map((word, index) => `
      <li>
        <button type="button" id="delete-${index}">Delete</button>
        <span class="word">${word}</span>
      </li>
    `).join('')

    for (let i = 0; i < items.bannedWords.length; i++) {
      document.getElementById('delete-' + i).addEventListener(
        'click',
        () => deleteWord(i, render)
      )
    }

    if (!isPopup) {
      const shouldExportBeHidden = items.bannedWords.length === 0
      if (shouldExportBeHidden) exportButton.hidden = true
      else exportButton.removeAttribute('hidden')
    }
  })
}

function addWord(word, cb) {
  chrome.storage.sync.get({
    bannedWords: []
  }, items => {
    chrome.storage.sync.set({
      bannedWords: items.bannedWords.concat(['r/' + word.toLowerCase().replaceAll('r/', '')])
    }, cb)
  })
}

function deleteWord (index, cb) {
  chrome.storage.sync.get({
    bannedWords: []
  }, items => {
    chrome.storage.sync.set({
      bannedWords: items.bannedWords.slice(0, index).concat(items.bannedWords.slice(index + 1))
    }, cb)
  })
}
