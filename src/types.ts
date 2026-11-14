export type IconKey = 'briefcase' | 'home' | 'graduation' | 'plane' | 'book' | 'lightbulb'

export interface Notebook {
  id: string
  name: string
  color: string
  icon: IconKey
}
export interface Section {
  id: string
  notebookId: string
  name: string
  color: string
}
export interface Page {
  id: string
  sectionId: string
  title: string
  html: string
  fav: boolean
  updated: number
}
export type Theme = 'light' | 'dark'

export interface State {
  notebooks: Notebook[]
  sections: Section[]
  pages: Page[]
  notebookId: string
  sectionId: string
  pageId: string
  theme: Theme
}
