import type { Notebook, Page, Section } from '../types'

export interface Changes {
  notebooks: Notebook[]; sections: Section[]; pages: Page[]
  deleted: { notebooks: string[]; sections: string[]; pages: string[] }
}

