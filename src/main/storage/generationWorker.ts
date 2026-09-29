import { parentPort, workerData } from 'worker_threads'

import { commitStoreGeneration, type GenerationCommitOptions } from './generationStore'
import type { Store } from '../types'

type WorkerInput = {
  store: Store
  dataPath: string
  options: GenerationCommitOptions
}

const input = workerData as WorkerInput

try {
  parentPort?.postMessage(commitStoreGeneration(input.store, input.dataPath, input.options))
} catch (error) {
  parentPort?.postMessage({
    success: false,
    revision: 0,
    previousRevision: 0,
    error: error instanceof Error ? error.message : String(error),
  })
} finally {
  parentPort?.close()
}

