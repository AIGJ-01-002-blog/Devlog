import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_TTL_MS, localDrafts } from './localDrafts';
const draft = (memberId, postId, contentMd = '본문') => ({
    memberId, postId, title: '제목', contentMd, baseVersion: 3, unsynced: true, pendingImages: [], savedAt: 1,
});
describe('이 기기의 작성 데이터', () => {
    beforeEach(async () => {
        await localDrafts.clearMember(1);
        await localDrafts.clearMember(2);
    });
    it('회원·글별로 따로 저장되고 다른 계정의 것은 보이지 않는다', async () => {
        await localDrafts.put(draft(1, 10, 'A'));
        await localDrafts.put(draft(2, 10, 'B'));
        expect((await localDrafts.get(1, 10))?.contentMd).toBe('A');
        expect((await localDrafts.get(2, 10))?.contentMd).toBe('B');
        expect(await localDrafts.get(1, 11)).toBeNull();
        await localDrafts.put({ ...draft(1, 10, 'A2'), unsynced: false });
        expect(await localDrafts.get(1, 10)).toMatchObject({ contentMd: 'A2', unsynced: false });
        await localDrafts.remove(1, 10);
        expect(await localDrafts.get(1, 10)).toBeNull();
    });
    it('백업은 최근 것부터 보이고 7일이 지나면 지워진다', async () => {
        const now = 10 * BACKUP_TTL_MS;
        await localDrafts.addBackup({ memberId: 1, postId: 10, title: 't', contentMd: 'old', at: now - BACKUP_TTL_MS - 1 });
        await localDrafts.addBackup({ memberId: 1, postId: 10, title: 't', contentMd: 'b1', at: now - 1000 });
        await localDrafts.addBackup({ memberId: 1, postId: 10, title: 't', contentMd: 'b2', at: now - 10 });
        const list = await localDrafts.backups(1, 10, now);
        expect(list.map((b) => b.contentMd)).toEqual(['b2', 'b1']);
        expect((await localDrafts.backups(1, 10, now)).length).toBe(2);
        await localDrafts.removeBackup(list[0]);
        expect((await localDrafts.backups(1, 10, now)).map((b) => b.contentMd)).toEqual(['b1']);
        await localDrafts.purgeExpired(now + BACKUP_TTL_MS);
        expect(await localDrafts.backups(1, 10, now)).toEqual([]);
    });
    it('로그아웃하면 그 회원의 작성 데이터·백업·대기 사진만 모두 지운다', async () => {
        await localDrafts.put(draft(1, 10));
        await localDrafts.put(draft(1, 11));
        await localDrafts.put(draft(2, 10));
        await localDrafts.addBackup({ memberId: 1, postId: 10, title: 't', contentMd: 'b', at: Date.now() });
        await localDrafts.addPendingImage({ id: 'p1', memberId: 1, postId: 10, blob: new Blob(['x']), createdAt: 1 });
        await localDrafts.clearMember(1);
        expect(await localDrafts.get(1, 10)).toBeNull();
        expect(await localDrafts.get(1, 11)).toBeNull();
        expect(await localDrafts.backups(1, 10)).toEqual([]);
        expect(await localDrafts.get(2, 10)).not.toBeNull();
    });
});
