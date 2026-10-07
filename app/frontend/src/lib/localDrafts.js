// 이 기기의 작성 데이터 (006, docs/04 §2-2·§2-7). 화면이 멈추지 않게 IndexedDB(비동기)를 쓴다.
// 회원·글별로 나눠 다른 계정·다른 글과 섞이지 않는다. 로그인 정보는 저장하지 않는다.
// IndexedDB를 못 쓰는 환경(사생활 보호 창 등)에서는 모든 동작이 조용히 아무것도 하지 않는다(서버 자동 저장만으로 동작).
const DB_NAME = 'blog-local';
const DB_VERSION = 1;
export const BACKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let opening = null;
function open() {
    if (opening)
        return opening;
    opening = new Promise((resolve) => {
        let req;
        try {
            if (typeof indexedDB === 'undefined')
                return resolve(null);
            req = indexedDB.open(DB_NAME, DB_VERSION);
        }
        catch {
            return resolve(null);
        }
        req.onupgradeneeded = () => {
            const db = req.result;
            db.createObjectStore('drafts', { keyPath: ['memberId', 'postId'] }).createIndex('member', 'memberId');
            const backups = db.createObjectStore('backups', { keyPath: ['memberId', 'postId', 'at'] });
            backups.createIndex('member', 'memberId');
            backups.createIndex('post', ['memberId', 'postId']);
            db.createObjectStore('pendingImages', { keyPath: 'id' }).createIndex('member', 'memberId');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
    });
    return opening;
}
async function run(store, mode, fn) {
    const db = await open();
    if (!db)
        return undefined;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(store, mode);
            const req = fn(tx.objectStore(store));
            tx.oncomplete = () => resolve(req ? req.result : undefined);
            tx.onerror = () => resolve(undefined);
            tx.onabort = () => resolve(undefined); // 저장 공간 부족 등: 서버 자동 저장으로 계속한다 (A-4)
        }
        catch {
            resolve(undefined);
        }
    });
}
/** 인덱스로 찾은 것을 모두 지운다. */
async function deleteBy(store, index, key) {
    await run(store, 'readwrite', (s) => {
        const req = s.index(index).openCursor(IDBKeyRange.only(key));
        req.onsuccess = () => {
            const c = req.result;
            if (c) {
                c.delete();
                c.continue();
            }
        };
    });
}
export const localDrafts = {
    async get(memberId, postId) {
        return (await run('drafts', 'readonly', (s) => s.get([memberId, postId]))) ?? null;
    },
    async put(draft) {
        const db = await open();
        if (!db)
            return false;
        await run('drafts', 'readwrite', (s) => s.put(draft));
        return true;
    },
    async remove(memberId, postId) {
        await run('drafts', 'readwrite', (s) => s.delete([memberId, postId]));
    },
    async addBackup(backup) {
        const db = await open();
        if (!db)
            return false;
        await run('backups', 'readwrite', (s) => s.put(backup));
        return true;
    },
    /** 이 글의 백업, 최근 것부터. 7일 지난 것은 빼고 지운다. */
    async backups(memberId, postId, now = Date.now()) {
        const all = (await run('backups', 'readonly', (s) => s.index('post').getAll([memberId, postId]))) ?? [];
        const expired = all.filter((b) => now - b.at > BACKUP_TTL_MS);
        if (expired.length) {
            await run('backups', 'readwrite', (s) => { expired.forEach((b) => s.delete([b.memberId, b.postId, b.at])); });
        }
        return all.filter((b) => now - b.at <= BACKUP_TTL_MS).sort((a, b) => b.at - a.at);
    },
    async removeBackup(b) {
        await run('backups', 'readwrite', (s) => s.delete([b.memberId, b.postId, b.at]));
    },
    /** 모든 회원의 7일 지난 백업을 지운다 (앱을 열 때). */
    async purgeExpired(now = Date.now()) {
        await run('backups', 'readwrite', (s) => {
            const req = s.openCursor();
            req.onsuccess = () => {
                const c = req.result;
                if (!c)
                    return;
                if (now - c.value.at > BACKUP_TTL_MS)
                    c.delete();
                c.continue();
            };
        });
    },
    async addPendingImage(img) {
        const db = await open();
        if (!db)
            return false;
        await run('pendingImages', 'readwrite', (s) => s.put(img));
        return true;
    },
    /** 이 글의 업로드 대기 사진 (009 FR-017). */
    async pendingImagesFor(memberId, postId) {
        const all = (await run('pendingImages', 'readonly', (s) => s.index('member').getAll(memberId))) ?? [];
        return all.filter((p) => p.postId === postId);
    },
    async removePendingImage(id) {
        await run('pendingImages', 'readwrite', (s) => s.delete(id));
    },
    /** 로그아웃 (FR-017): 그 회원의 작성 데이터·백업·대기 사진을 모두 지운다. */
    async clearMember(memberId) {
        await Promise.all([
            deleteBy('drafts', 'member', memberId),
            deleteBy('backups', 'member', memberId),
            deleteBy('pendingImages', 'member', memberId),
        ]);
    },
    /** 테스트용: 열린 연결을 버린다. */
    _reset() {
        opening = null;
    },
};
