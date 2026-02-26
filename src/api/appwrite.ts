import { Client, Account, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('standard_ed815cd52f74da407ff56261510d69db1')

export const account = new Account(client)
export const storage = new Storage(client)

export const BUCKET_ID = 'organon-stores'
