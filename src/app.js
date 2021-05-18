const tagSelector = '[data-click-id="subreddit"]'
const postSelector = '.Post'

const isPost = node => node.classList.contains('Post')

const getPostByLink = linkNode => {
    const parent = linkNode.parentNode
    if (!parent) return linkNode
    if (isPost(parent)) return parent
    return getPostByLink(parent)
}

const getPostsContainer = (onePostNode = document.querySelector(postSelector)) => {
    const parent = onePostNode.parentNode
    if (parent.childElementCount > 1) return parent
    return getPostsContainer(parent)
}

const debounce = (fn, wait = 100) => {
    // this is double debounce
    // it fires like this
    // calls:          1111111111111111
    // actually fired: 1000000000000001

    // so only first and last call

    let shouldCallMore
    let timer
    let maxWaitTimer
    let isWaiting
    let fnArgs = []

    const stopWaiting = () => {
        if (shouldCallMore) fn(...fnArgs)
        isWaiting = shouldCallMore = false
    }

    const call = () => {
        shouldCallMore = false
        fn(...fnArgs)
    }

    return (...args) => {
        fnArgs = args

        shouldCallMore = true

        clearTimeout(timer)
        timer = setTimeout(stopWaiting, wait)

        if (isWaiting) return
        isWaiting = true

        clearTimeout(maxWaitTimer)
        maxWaitTimer = setTimeout(call, 20)
    }
}

let observer

const start = () => {
    if (observer) return

    const handleChanges = () => debounce(chrome.storage.sync.get(null, store => {
        const bannedTags = (store.bannedWords || []).map(tag => tag.toLowerCase())
        if (bannedTags.length === 0) return

        const links = document.querySelectorAll(tagSelector)

        links.forEach(link => {
            const linkText = link.getAttribute('href')
                .replace('r/', '')
                .replaceAll('/', '')
                .toLowerCase()

            const shouldBlock =
                bannedTags.includes(linkText) ||
                bannedTags.includes('r/' + linkText)

            if (!shouldBlock) return

            const post = getPostByLink(link)
            if (!post.remove) return
            post.remove()
        })
    }))

    const postsContainer = getPostsContainer()
    if (!postsContainer) {
        console.error('Hazmat: It seems like Reddit UI is changed. Hazmat needs to be updated to support a new Reddit. Please open an issue at https://github.com/mvoloskov/hazmat to get Hazmat updated.')
        return
    }

    handleChanges()
    observer = new MutationObserver(handleChanges)
    observer.observe(postsContainer, {
        childList: true,
    })
}

if (document.readyState === 'interactive' || document.readyState === 'complete') {
    start()
} else {
    document.addEventListener('DOMContentLoaded', start)
}
