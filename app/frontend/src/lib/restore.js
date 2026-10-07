export function decideRestore(server, local) {
    if (!local)
        return 'none';
    if (!local.unsynced)
        return 'discard';
    if (local.title === server.title && local.contentMd === server.contentMd)
        return 'discard';
    return local.baseVersion === server.version ? 'load' : 'conflict';
}
