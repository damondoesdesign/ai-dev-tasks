import { hasFirebase } from './config'
import type { Repo } from './repo'
import { LocalRepo } from './repoLocal'

let repo: Repo | null = null

export async function getRepo(): Promise<Repo> {
  if (repo) return repo
  if (hasFirebase) {
    const { FirestoreRepo } = await import('./repoFirestore')
    repo = new FirestoreRepo()
  } else {
    repo = new LocalRepo()
  }
  return repo
}
