import { randomUUID } from 'crypto'

export class StorageHydrationGuard {
  private readonly hydrationTokens = new Map<number, string>()

  markHydrated(clientId: number): string {
    const token = randomUUID()
    this.hydrationTokens.set(clientId, token)
    return token
  }

  revoke(clientId: number): void {
    this.hydrationTokens.delete(clientId)
  }

  canWrite(clientId: number, hydrationToken: string): boolean {
    return this.hydrationTokens.get(clientId) === hydrationToken
  }
}
