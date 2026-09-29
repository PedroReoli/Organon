export class StorageHydrationGuard {
  private readonly hydratedClientIds = new Set<number>()

  markHydrated(clientId: number): void {
    this.hydratedClientIds.add(clientId)
  }

  revoke(clientId: number): void {
    this.hydratedClientIds.delete(clientId)
  }

  canWrite(clientId: number): boolean {
    return this.hydratedClientIds.has(clientId)
  }
}
