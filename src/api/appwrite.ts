import { Client, Account, Storage, Databases, Query } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69a04328002453254a38')

// Verifica conexão com o servidor Appwrite ao inicializar
client.ping().then(() => {
  console.log('[Appwrite] Conexão OK')
}).catch((err) => {
  console.warn('[Appwrite] Falha na conexão:', err)
})

export const account   = new Account(client)
export const storage   = new Storage(client)
export const databases = new Databases(client)
export { Query }

export const BUCKET_ID   = 'organon-stores'
export const DATABASE_ID = 'organon-db'
