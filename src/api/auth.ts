import { ID, Models } from 'appwrite'
import { account } from './appwrite'

export async function signIn(email: string, password: string): Promise<Models.Session> {
  return account.createEmailPasswordSession(email, password)
}

export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<Models.User<Models.Preferences>> {
  const user = await account.create(ID.unique(), email, password, name)
  await account.createEmailPasswordSession(email, password)
  return user
}

export async function signOut(): Promise<void> {
  await account.deleteSession('current')
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    return await account.get()
  } catch {
    return null
  }
}
