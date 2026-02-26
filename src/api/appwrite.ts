import { Client, Account, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('69a04328002453254a38')

export const account = new Account(client)
export const storage = new Storage(client)

export const BUCKET_ID = 'organon-stores'
