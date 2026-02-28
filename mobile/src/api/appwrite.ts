import { Client, Account, Storage, Databases, Query } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69a04328002453254a38')

export const account   = new Account(client)
export const storage   = new Storage(client)
export const databases = new Databases(client)
export { Query }

export const BUCKET_ID    = 'organon-stores'
export const DATABASE_ID  = 'organon-db'
export const PROJECT_ID   = '69a04328002453254a38'
export const ENDPOINT     = 'https://fra.cloud.appwrite.io/v1'
