import * as path from 'path'
import { Worker } from 'worker_threads'

import type { Store } from '../types'
import type { GenerationCommitOptions, GenerationCommitResult } from './generationStore'

const WORKER_TIMEOUT_MS = 120_000

export const commitStoreGenerationAsync = (
  store: Store,
  dataPath: string,
  options: GenerationCommitOptions = {},
): Promise<GenerationCommitResult> => new Promise((resolve, reject) => {
  const worker = new Worker(path.join(__dirname, 'generationWorker.js'), {
    workerData: { store, dataPath, options },
  })
  let settled = false
  const timeout = setTimeout(() => {
    if (settled) return
    settled = true
    void worker.terminate()
    reject(new Error(`Commit transacional excedeu ${WORKER_TIMEOUT_MS} ms.`))
  }, WORKER_TIMEOUT_MS)
  timeout.unref()

  worker.once('message', (result: GenerationCommitResult) => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    resolve(result)
  })
  worker.once('error', error => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    reject(error)
  })
  worker.once('exit', code => {
    if (settled || code === 0) return
    settled = true
    clearTimeout(timeout)
    reject(new Error(`Worker de storage encerrou com codigo ${code}.`))
  })
})

